use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("6qpmGN1jHG1wwfETtQ63mkzMZtFpuPB8HggzP6GqLyEz");
const USDC: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const TIMEOUT: i64 = 600;
const MAX_AUTHORS: usize = 5;

#[program]
pub mod skill_vault {
    use super::*;
    pub fn register_version(
        ctx: Context<RegisterVersion>,
        version_id: [u8; 32],
        price: u64,
        splits: Vec<SplitInput>,
    ) -> Result<()> {
        require!(
            price > 0 && !splits.is_empty() && splits.len() <= MAX_AUTHORS,
            VaultError::InvalidConfig
        );
        require!(
            splits.iter().map(|s| s.bps as u32).sum::<u32>() == 10_000,
            VaultError::InvalidConfig
        );
        for (i, s) in splits.iter().enumerate() {
            require!(
                s.bps > 0 && !splits[..i].iter().any(|other| other.wallet == s.wallet),
                VaultError::InvalidConfig
            );
        }
        let v = &mut ctx.accounts.version;
        v.issuer = ctx.accounts.issuer.key();
        v.mint = ctx.accounts.mint.key();
        v.version_id = version_id;
        v.price = price;
        v.splits = splits
            .into_iter()
            .map(|s| Split {
                wallet: s.wallet,
                bps: s.bps,
                approved: false,
            })
            .collect();
        v.active = false;
        v.bump = ctx.bumps.version;
        Ok(())
    }
    pub fn approve_version(ctx: Context<ApproveVersion>) -> Result<()> {
        let v = &mut ctx.accounts.version;
        let split = v
            .splits
            .iter_mut()
            .find(|s| s.wallet == ctx.accounts.author.key())
            .ok_or(VaultError::Unauthorized)?;
        split.approved = true;
        v.active = v.splits.iter().all(|s| s.approved);
        Ok(())
    }
    pub fn pay(ctx: Context<Pay>, encryption_public_key: [u8; 32]) -> Result<()> {
        require!(ctx.accounts.version.active, VaultError::Unapproved);
        let o = &mut ctx.accounts.order;
        require!(o.status == 0 || o.status == 3, VaultError::AlreadyPaid);
        require!(
            encryption_public_key != [0u8; 32],
            VaultError::InvalidConfig
        );
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_tokens.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            ctx.accounts.version.price,
        )?;
        let now = Clock::get()?.unix_timestamp;
        o.buyer = ctx.accounts.buyer.key();
        o.version = ctx.accounts.version.key();
        o.encryption_public_key = encryption_public_key;
        o.paid_at = now;
        o.expires_at = now.checked_add(TIMEOUT).ok_or(VaultError::InvalidConfig)?;
        o.status = 1;
        o.bump = ctx.bumps.order;
        emit!(Funded {
            version: o.version,
            buyer: o.buyer,
            amount: ctx.accounts.version.price
        });
        Ok(())
    }
    pub fn settle<'info>(ctx: Context<'_, '_, '_, 'info, Settle<'info>>) -> Result<()> {
        require!(ctx.accounts.order.status == 1, VaultError::NotFunded);
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.order.expires_at,
            VaultError::Expired
        );
        let v = &ctx.accounts.version;
        require!(
            ctx.remaining_accounts.len() == v.splits.len(),
            VaultError::InvalidRecipient
        );
        // Validate every recipient before moving any funds; CPI failures roll back the entire transaction.
        for (split, info) in v.splits.iter().zip(ctx.remaining_accounts.iter()) {
            require_keys_eq!(
                info.key(),
                associated_token::get_associated_token_address(&split.wallet, &v.mint),
                VaultError::InvalidRecipient
            );
            require_keys_eq!(*info.owner, token::ID, VaultError::InvalidRecipient);
            require!(info.is_writable, VaultError::InvalidRecipient);
            let data = info.try_borrow_data()?;
            let recipient = TokenAccount::try_deserialize(&mut &data[..])?;
            require_keys_eq!(recipient.owner, split.wallet, VaultError::InvalidRecipient);
            require_keys_eq!(recipient.mint, v.mint, VaultError::InvalidRecipient);
        }
        let version_key = v.key();
        let buyer_key = ctx.accounts.buyer.key();
        let bump = [ctx.accounts.order.bump];
        let seeds: &[&[u8]] = &[b"order", version_key.as_ref(), buyer_key.as_ref(), &bump];
        let signer = &[seeds];
        let mut distributed = 0u64;
        for (i, (split, info)) in v
            .splits
            .iter()
            .zip(ctx.remaining_accounts.iter())
            .enumerate()
        {
            let amount = if i == v.splits.len() - 1 {
                v.price - distributed
            } else {
                ((v.price as u128) * (split.bps as u128) / 10_000) as u64
            };
            distributed = distributed
                .checked_add(amount)
                .ok_or(VaultError::InvalidConfig)?;
            if amount > 0 {
                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow.to_account_info(),
                            to: info.clone(),
                            authority: ctx.accounts.order.to_account_info(),
                        },
                        signer,
                    ),
                    amount,
                )?;
            }
        }
        ctx.accounts.order.status = 2;
        emit!(Granted {
            version: version_key,
            buyer: buyer_key,
            amount: v.price
        });
        Ok(())
    }
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        require!(ctx.accounts.order.status == 1, VaultError::NotFunded);
        require!(
            Clock::get()?.unix_timestamp >= ctx.accounts.order.expires_at,
            VaultError::NotExpired
        );
        let version_key = ctx.accounts.version.key();
        let buyer_key = ctx.accounts.buyer.key();
        let bump = [ctx.accounts.order.bump];
        let seeds: &[&[u8]] = &[b"order", version_key.as_ref(), buyer_key.as_ref(), &bump];
        let signer = &[seeds];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.buyer_tokens.to_account_info(),
                    authority: ctx.accounts.order.to_account_info(),
                },
                signer,
            ),
            ctx.accounts.version.price,
        )?;
        ctx.accounts.order.status = 3;
        emit!(Refunded {
            version: version_key,
            buyer: buyer_key
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(version_id:[u8;32])]
pub struct RegisterVersion<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(init,payer=issuer,space=VersionState::SPACE,seeds=[b"version",issuer.key().as_ref(),version_id.as_ref()],bump)]
    pub version: Account<'info, VersionState>,
    #[account(address=USDC)]
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ApproveVersion<'info> {
    #[account(mut,seeds=[b"version",version.issuer.as_ref(),version.version_id.as_ref()],bump=version.bump)]
    pub version: Account<'info, VersionState>,
    pub author: Signer<'info>,
}
#[derive(Accounts)]
pub struct Pay<'info> {
    #[account(seeds=[b"version",version.issuer.as_ref(),version.version_id.as_ref()],bump=version.bump,has_one=mint)]
    pub version: Account<'info, VersionState>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(init_if_needed,payer=buyer,space=OrderState::SPACE,seeds=[b"order",version.key().as_ref(),buyer.key().as_ref()],bump)]
    pub order: Account<'info, OrderState>,
    #[account(address=USDC)]
    pub mint: Account<'info, Mint>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=buyer)]
    pub buyer_tokens: Account<'info, TokenAccount>,
    #[account(init_if_needed,payer=buyer,associated_token::mint=mint,associated_token::authority=order)]
    pub escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(seeds=[b"version",version.issuer.as_ref(),version.version_id.as_ref()],bump=version.bump,has_one=issuer,has_one=mint)]
    pub version: Account<'info, VersionState>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// CHECK: compared to the recorded buyer and used only as a PDA seed.
    #[account(address=order.buyer)]
    pub buyer: UncheckedAccount<'info>,
    #[account(mut,seeds=[b"order",version.key().as_ref(),buyer.key().as_ref()],bump=order.bump,has_one=version)]
    pub order: Account<'info, OrderState>,
    #[account(address=USDC)]
    pub mint: Account<'info, Mint>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=order)]
    pub escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(seeds=[b"version",version.issuer.as_ref(),version.version_id.as_ref()],bump=version.bump,has_one=mint)]
    pub version: Account<'info, VersionState>,
    #[account(mut,address=order.buyer)]
    pub buyer: Signer<'info>,
    #[account(mut,seeds=[b"order",version.key().as_ref(),buyer.key().as_ref()],bump=order.bump,has_one=version)]
    pub order: Account<'info, OrderState>,
    #[account(address=USDC)]
    pub mint: Account<'info, Mint>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=order)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(init_if_needed,payer=buyer,associated_token::mint=mint,associated_token::authority=buyer)]
    pub buyer_tokens: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
#[account]
pub struct VersionState {
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub version_id: [u8; 32],
    pub price: u64,
    pub splits: Vec<Split>,
    pub active: bool,
    pub bump: u8,
}
impl VersionState {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 4 + MAX_AUTHORS * (32 + 2 + 1) + 1 + 1;
}
#[account]
pub struct OrderState {
    pub buyer: Pubkey,
    pub version: Pubkey,
    pub encryption_public_key: [u8; 32],
    pub paid_at: i64,
    pub expires_at: i64,
    pub status: u8,
    pub bump: u8,
}
impl OrderState {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SplitInput {
    pub wallet: Pubkey,
    pub bps: u16,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Split {
    pub wallet: Pubkey,
    pub bps: u16,
    pub approved: bool,
}
#[event]
pub struct Funded {
    pub version: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
}
#[event]
pub struct Granted {
    pub version: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
}
#[event]
pub struct Refunded {
    pub version: Pubkey,
    pub buyer: Pubkey,
}
#[error_code]
pub enum VaultError {
    #[msg("Invalid immutable version configuration")]
    InvalidConfig,
    #[msg("Signer is not an approved author or issuer")]
    Unauthorized,
    #[msg("All authors must approve the version")]
    Unapproved,
    #[msg("Already funded or permanently licensed")]
    AlreadyPaid,
    #[msg("Order is not funded")]
    NotFunded,
    #[msg("Settlement deadline passed")]
    Expired,
    #[msg("Refund deadline has not passed")]
    NotExpired,
    #[msg("Invalid royalty recipient")]
    InvalidRecipient,
}
