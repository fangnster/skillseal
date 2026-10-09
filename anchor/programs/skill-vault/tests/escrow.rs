use anchor_lang::{AccountDeserialize, AccountSerialize, InstructionData, ToAccountMetas};
use skill_vault::{OrderState, Split, SplitInput, VersionState};
use solana_program_test::{ProgramTest, ProgramTestContext};
use solana_sdk::{
    account::Account,
    clock::Clock,
    instruction::{AccountMeta, Instruction},
    program_pack::Pack,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use spl_token::state::{Account as TokenAccount, AccountState, Mint};

// Load the compiled SBF contract and program-test's official embedded SPL binaries.
fn serialized<T: AccountSerialize>(value: &T, size: usize) -> Vec<u8> {
    let mut data = Vec::new();
    value.try_serialize(&mut data).unwrap();
    data.resize(size, 0);
    data
}
fn token(owner: Pubkey, mint: Pubkey, amount: u64) -> Account {
    let state = TokenAccount {
        mint,
        owner,
        amount,
        delegate: None.into(),
        state: AccountState::Initialized,
        is_native: None.into(),
        delegated_amount: 0,
        close_authority: None.into(),
    };
    let mut data = vec![0; TokenAccount::LEN];
    TokenAccount::pack(state, &mut data).unwrap();
    Account {
        lamports: 10_000_000,
        data,
        owner: spl_token::id(),
        executable: false,
        rent_epoch: 0,
    }
}
async fn submit(
    ctx: &mut ProgramTestContext,
    instruction: Instruction,
    signers: &[&Keypair],
) -> bool {
    let block = ctx.banks_client.get_latest_blockhash().await.unwrap();
    let mut all = vec![&ctx.payer];
    all.extend_from_slice(signers);
    let tx =
        Transaction::new_signed_with_payer(&[instruction], Some(&ctx.payer.pubkey()), &all, block);
    match ctx.banks_client.process_transaction(tx).await {
        Ok(()) => true,
        Err(error) => {
            eprintln!("Transaction rejected: {error:?}");
            false
        }
    }
}
async fn balance(ctx: &mut ProgramTestContext, address: Pubkey) -> u64 {
    TokenAccount::unpack(
        &ctx.banks_client
            .get_account(address)
            .await
            .unwrap()
            .unwrap()
            .data,
    )
    .unwrap()
    .amount
}

#[tokio::test]
async fn settlement_is_authorized_atomic_and_cannot_repeat() {
    let program = skill_vault::id();
    let issuer = Keypair::new();
    let buyer = Keypair::new();
    let attacker = Keypair::new();
    let mint: Pubkey = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        .parse()
        .unwrap();
    let author_a = Pubkey::new_unique();
    let author_b = Pubkey::new_unique();
    let hash = [7u8; 32];
    let (version, vb) =
        Pubkey::find_program_address(&[b"version", issuer.pubkey().as_ref(), &hash], &program);
    let (order, ob) = Pubkey::find_program_address(
        &[b"order", version.as_ref(), buyer.pubkey().as_ref()],
        &program,
    );
    let escrow = anchor_spl::associated_token::get_associated_token_address(&order, &mint);
    let a = anchor_spl::associated_token::get_associated_token_address(&author_a, &mint);
    let b = anchor_spl::associated_token::get_associated_token_address(&author_b, &mint);
    let buyer_tokens =
        anchor_spl::associated_token::get_associated_token_address(&buyer.pubkey(), &mint);
    let mut test = ProgramTest::new("skill_vault", program, None);
    for wallet in [issuer.pubkey(), buyer.pubkey(), attacker.pubkey()] {
        test.add_account(
            wallet,
            Account {
                lamports: 1_000_000_000,
                data: vec![],
                owner: solana_sdk::system_program::id(),
                executable: false,
                rent_epoch: 0,
            },
        );
    }
    let mut mint_data = vec![0; Mint::LEN];
    Mint::pack(
        Mint {
            mint_authority: None.into(),
            supply: 1_000_000,
            decimals: 6,
            is_initialized: true,
            freeze_authority: None.into(),
        },
        &mut mint_data,
    )
    .unwrap();
    test.add_account(
        mint,
        Account {
            lamports: 10_000_000,
            data: mint_data,
            owner: spl_token::id(),
            executable: false,
            rent_epoch: 0,
        },
    );
    let v = VersionState {
        issuer: issuer.pubkey(),
        mint,
        version_id: hash,
        price: 1_000_001,
        splits: vec![
            Split {
                wallet: author_a,
                bps: 7000,
                approved: true,
            },
            Split {
                wallet: author_b,
                bps: 3000,
                approved: true,
            },
        ],
        active: true,
        bump: vb,
    };
    let o = OrderState {
        buyer: buyer.pubkey(),
        version,
        encryption_public_key: [5; 32],
        paid_at: 0,
        expires_at: i64::MAX,
        status: 1,
        bump: ob,
    };
    test.add_account(
        version,
        Account {
            lamports: 10_000_000,
            data: serialized(&v, VersionState::SPACE),
            owner: program,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        order,
        Account {
            lamports: 10_000_000,
            data: serialized(&o, OrderState::SPACE),
            owner: program,
            executable: false,
            rent_epoch: 0,
        },
    );
    for (address, owner, amount) in [
        (escrow, order, 1_000_001),
        (a, author_a, 0),
        (b, author_b, 0),
        (buyer_tokens, buyer.pubkey(), 0),
    ] {
        test.add_account(address, token(owner, mint, amount));
    }
    let mut ctx = test.start_with_context().await;
    let settle = |signer: Pubkey, second: Pubkey| {
        let mut accounts = skill_vault::accounts::Settle {
            version,
            issuer: signer,
            buyer: buyer.pubkey(),
            order,
            mint,
            escrow,
            token_program: spl_token::id(),
        }
        .to_account_metas(None);
        accounts.extend([AccountMeta::new(a, false), AccountMeta::new(second, false)]);
        Instruction {
            program_id: program,
            accounts,
            data: skill_vault::instruction::Settle {}.data(),
        }
    };
    assert!(!submit(&mut ctx, settle(attacker.pubkey(), b), &[&attacker]).await);
    assert!(!submit(&mut ctx, settle(issuer.pubkey(), buyer_tokens), &[&issuer]).await);
    assert_eq!(balance(&mut ctx, escrow).await, 1_000_001);
    assert_eq!(balance(&mut ctx, a).await, 0);
    let mut frozen = token(author_b, mint, 0);
    let mut state = TokenAccount::unpack(&frozen.data).unwrap();
    state.state = AccountState::Frozen;
    TokenAccount::pack(state, &mut frozen.data).unwrap();
    ctx.set_account(&b, &frozen.into());
    // The first author's CPI succeeds, the second fails; the runtime must roll everything back.
    assert!(!submit(&mut ctx, settle(issuer.pubkey(), b), &[&issuer]).await);
    assert_eq!(balance(&mut ctx, a).await, 0);
    assert_eq!(balance(&mut ctx, escrow).await, 1_000_001);
    let raw = ctx.banks_client.get_account(order).await.unwrap().unwrap();
    assert_eq!(
        OrderState::try_deserialize(&mut &raw.data[..])
            .unwrap()
            .status,
        1
    );
    ctx.set_account(&b, &token(author_b, mint, 0).into());
    ctx.warp_to_slot(10).unwrap();
    assert!(submit(&mut ctx, settle(issuer.pubkey(), b), &[&issuer]).await);
    assert_eq!(balance(&mut ctx, a).await, 700_000);
    assert_eq!(balance(&mut ctx, b).await, 300_001);
    assert_eq!(balance(&mut ctx, escrow).await, 0);
    let raw = ctx.banks_client.get_account(order).await.unwrap().unwrap();
    assert_eq!(
        OrderState::try_deserialize(&mut &raw.data[..])
            .unwrap()
            .status,
        2
    );
    // Fresh blockhash avoids duplicate-transaction caching and exercises the handler again.
    ctx.warp_to_slot(20).unwrap();
    assert!(!submit(&mut ctx, settle(issuer.pubkey(), b), &[&issuer]).await);
}

#[tokio::test]
async fn authors_approve_before_payment_and_only_expired_unsettled_orders_refund() {
    let program = skill_vault::id();
    let issuer = Keypair::new();
    let buyer = Keypair::new();
    let a = Keypair::new();
    let b = Keypair::new();
    let attacker = Keypair::new();
    let mint: Pubkey = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        .parse()
        .unwrap();
    let wrong_mint = Pubkey::new_unique();
    let hash = [9; 32];
    let (version, _) =
        Pubkey::find_program_address(&[b"version", issuer.pubkey().as_ref(), &hash], &program);
    let (order, _) = Pubkey::find_program_address(
        &[b"order", version.as_ref(), buyer.pubkey().as_ref()],
        &program,
    );
    let escrow = anchor_spl::associated_token::get_associated_token_address(&order, &mint);
    let buyer_tokens =
        anchor_spl::associated_token::get_associated_token_address(&buyer.pubkey(), &mint);
    let mut test = ProgramTest::new("skill_vault", program, None);
    for wallet in [
        issuer.pubkey(),
        buyer.pubkey(),
        a.pubkey(),
        b.pubkey(),
        attacker.pubkey(),
    ] {
        test.add_account(
            wallet,
            Account {
                lamports: 1_000_000_000,
                data: vec![],
                owner: solana_sdk::system_program::id(),
                executable: false,
                rent_epoch: 0,
            },
        );
    }
    for address in [mint, wrong_mint] {
        let mut data = vec![0; Mint::LEN];
        Mint::pack(
            Mint {
                mint_authority: None.into(),
                supply: 1_000_000,
                decimals: 6,
                is_initialized: true,
                freeze_authority: None.into(),
            },
            &mut data,
        )
        .unwrap();
        test.add_account(
            address,
            Account {
                lamports: 10_000_000,
                data,
                owner: spl_token::id(),
                executable: false,
                rent_epoch: 0,
            },
        );
    }
    test.add_account(buyer_tokens, token(buyer.pubkey(), mint, 999_999));
    let mut ctx = test.start_with_context().await;
    let register = |token_mint: Pubkey, price: u64| Instruction {
        program_id: program,
        accounts: skill_vault::accounts::RegisterVersion {
            issuer: issuer.pubkey(),
            version,
            mint: token_mint,
            system_program: solana_sdk::system_program::id(),
        }
        .to_account_metas(None),
        data: skill_vault::instruction::RegisterVersion {
            version_id: hash,
            price,
            splits: vec![
                SplitInput {
                    wallet: a.pubkey(),
                    bps: 7000,
                },
                SplitInput {
                    wallet: b.pubkey(),
                    bps: 3000,
                },
            ],
        }
        .data(),
    };
    assert!(!submit(&mut ctx, register(wrong_mint, 1_000_000), &[&issuer]).await);
    assert!(submit(&mut ctx, register(mint, 1_000_000), &[&issuer]).await);
    ctx.warp_to_slot(10).unwrap();
    assert!(!submit(&mut ctx, register(mint, 1_000_000), &[&issuer]).await);
    let approval = |author: Pubkey| Instruction {
        program_id: program,
        accounts: skill_vault::accounts::ApproveVersion { version, author }.to_account_metas(None),
        data: skill_vault::instruction::ApproveVersion {}.data(),
    };
    assert!(!submit(&mut ctx, approval(attacker.pubkey()), &[&attacker]).await);
    assert!(submit(&mut ctx, approval(a.pubkey()), &[&a]).await);
    let pay = Instruction {
        program_id: program,
        accounts: skill_vault::accounts::Pay {
            version,
            buyer: buyer.pubkey(),
            order,
            mint,
            buyer_tokens,
            escrow,
            token_program: spl_token::id(),
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: solana_sdk::system_program::id(),
        }
        .to_account_metas(None),
        data: skill_vault::instruction::Pay {
            encryption_public_key: [5; 32],
        }
        .data(),
    };
    assert!(!submit(&mut ctx, pay.clone(), &[&buyer]).await);
    assert!(submit(&mut ctx, approval(b.pubkey()), &[&b]).await);
    ctx.warp_to_slot(20).unwrap();
    assert!(!submit(&mut ctx, pay.clone(), &[&buyer]).await); // Amount below the fixed version price.
    assert_eq!(balance(&mut ctx, buyer_tokens).await, 999_999);
    assert!(ctx.banks_client.get_account(order).await.unwrap().is_none()); // Failed funding is atomic.
    ctx.set_account(
        &buyer_tokens,
        &token(buyer.pubkey(), mint, 1_000_000).into(),
    );
    ctx.warp_to_slot(30).unwrap();
    assert!(submit(&mut ctx, pay.clone(), &[&buyer]).await);
    assert_eq!(balance(&mut ctx, escrow).await, 1_000_000);
    assert_eq!(balance(&mut ctx, buyer_tokens).await, 0);
    ctx.warp_to_slot(40).unwrap();
    assert!(!submit(&mut ctx, pay, &[&buyer]).await);
    let refund = |signer: Pubkey| Instruction {
        program_id: program,
        accounts: skill_vault::accounts::Refund {
            version,
            buyer: signer,
            order,
            mint,
            escrow,
            buyer_tokens,
            token_program: spl_token::id(),
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: solana_sdk::system_program::id(),
        }
        .to_account_metas(None),
        data: skill_vault::instruction::Refund {}.data(),
    };
    assert!(!submit(&mut ctx, refund(buyer.pubkey()), &[&buyer]).await);
    let raw = ctx.banks_client.get_account(order).await.unwrap().unwrap();
    let funded = OrderState::try_deserialize(&mut &raw.data[..]).unwrap();
    ctx.warp_to_slot(50).unwrap();
    let mut clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp = funded.expires_at;
    ctx.set_sysvar(&clock);
    assert!(!submit(&mut ctx, refund(attacker.pubkey()), &[&attacker]).await);
    assert!(submit(&mut ctx, refund(buyer.pubkey()), &[&buyer]).await);
    assert_eq!(balance(&mut ctx, buyer_tokens).await, 1_000_000);
    assert_eq!(balance(&mut ctx, escrow).await, 0);
    let raw = ctx.banks_client.get_account(order).await.unwrap().unwrap();
    assert_eq!(
        OrderState::try_deserialize(&mut &raw.data[..])
            .unwrap()
            .status,
        3
    );
}
