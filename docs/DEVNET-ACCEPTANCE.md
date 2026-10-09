# Public Devnet acceptance

Status on October 9, 2026: **pending**. The packaged project has not completed a public Devnet deployment or a wallet-extension test-USDC purchase. Earlier faucet requests failed due to rate limiting. Local SBF ProgramTest results and mock payments remain separate evidence.

Use test funds only. Keep keypair files, `.env.local`, the vault master key, and session private keys out of repository files, recordings and logs.

## Preparation

1. Use a dedicated test deployment copy. `pnpm run setup` creates a new program identity and key vault; it refuses to replace existing configuration. Build the program after setup so its declared ID matches the generated keypair.
2. Follow the current build/deploy commands in [the Devnet guide](README.zh-CN.md#solana-devnet). Point `SOLANA_RPC_URL` to Devnet and verify the genesis hash is `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
3. Obtain sufficient test SOL for deployment and the issuer's account creation/settlement costs. Authors and buyer need test SOL for their signed transactions. The buyer also needs test USDC at mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
4. Back up the key vault separately from the SQLite data. Keep the API and worker on the same durable data directory. Run one persistent service instance for this SQLite MVP; do not assume ephemeral serverless storage will preserve purchased keys.
5. Run seed or publish the example and have every author approve the version. Record the immutable version identity and both author wallet addresses.

## Deployment commands

Run from a dedicated test copy with dependencies installed and compatible Rust, Solana CLI, and SBF tools available. The project was previously built with Anchor 0.32.2, Agave 2.3.13 and platform-tools 1.53; these are recorded versions, not a claim about the latest releases.

```sh
pnpm run setup
cd anchor
cargo build-sbf --tools-version v1.53 --manifest-path programs/skill-vault/Cargo.toml
cd ..
solana --url devnet --keypair .data/issuer.json airdrop 2
# Verify sufficient deployment rent and fees; an airdrop can fail or be insufficient.
solana --url devnet --keypair .data/issuer.json balance
solana --url devnet --keypair .data/issuer.json program deploy \
  --program-id anchor/target/deploy/skill_vault-keypair.json \
  anchor/target/deploy/skill_vault.so
pnpm run seed
```

After funding the two generated author addresses with test SOL, use the version ID printed by seed:

```sh
pnpm run cli approve VERSION_ID --wallet .data/author-a.json
pnpm run cli approve VERSION_ID --wallet .data/author-b.json
pnpm run dev
# In a separate terminal:
pnpm run worker
```

For a browser purchase, the installer command prints the checkout URL; connect a Devnet wallet with test SOL and test USDC. Do not disclose or export its wallet-extension secret key.

```sh
pnpm run cli install VERSION_ID --destination ./skills/first-install
# Reinstall with the same buyer wallet into a new directory:
pnpm run cli install VERSION_ID --destination ./skills/reinstall
```

Use [Solana's official faucet](https://faucet.solana.com/) and [Circle's test USDC faucet](https://faucet.circle.com/) for test assets. Respect their current limits and supported automation methods. Key creation alone does not demonstrate a funded or deployed program.

## Acceptance sequence

| Scenario             | Required observation                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chain and deployment | Public Devnet genesis; deployed program account and deployment signature; program ID matches the build and config.                                                                           |
| Author consent       | Both author approval transactions finalized; version becomes active only after all approvals.                                                                                                |
| Browser purchase     | Ciphertext is downloaded; buyer signs a challenge and a validated Devnet transaction; UI distinguishes submitted payment, escrow, and granted license.                                       |
| Settlement           | Finalized payment and settlement signatures; permanent wallet/version grant; two authors receive exactly 70/30 of the sample price, excluding separately reported fees and account deposits. |
| Delivery             | Resume with the private browser session; installed files match the release and include the complete example workflow.                                                                        |
| Reinstall            | Same wallet and same version recover with a fresh encryption key; author balances do not change from a second payout.                                                                        |
| Interrupted checkout | Close checkout after submission and resume the same order/session; do not create a second purchase to hide a recovery failure.                                                               |
| Timeout refund       | Stop settlement for a separate order; early refund is rejected; original buyer can refund after 600 seconds; refunded order cannot claim a key. Restore the worker afterward.                |
| Offline files        | Stop the delivery service and open the installed Skill and its reference assets. This demonstrates file availability; an actual Agent run is a separate demonstration.                       |

Record public signatures, Explorer links with `cluster=devnet`, initial/final token balances, and actual outcomes in `VALIDATION.md`. Record failed attempts as well as successful ones. A transaction broadcast or a browser success message alone is insufficient proof of a grant.

## Public deployment gate

Before exposing a hosted beta, use HTTPS and production mode, durable storage, key backups, a funded issuer, and controlled creator onboarding. Publishing currently uses issuer funds to register versions: unrestricted public publishing can consume those funds. Keep onboarding curated until an allowlist or quota is implemented. Do not enable local mock payments in production; the application deliberately rejects that configuration.

## Evidence fields to complete

- Program ID and deployment transaction: pending.
- Version ID and author approvals: pending.
- Payment and settlement signatures: pending.
- Author balance deltas and account costs: pending.
- Installed version and recovered reinstall: pending.
- Timeout refund and rejected post-refund claim: pending.
- Browser wallet, RPC endpoint, run timestamp, failures and known limitations: pending.
