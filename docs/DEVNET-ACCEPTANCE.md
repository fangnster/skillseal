# Public Devnet acceptance

Status on October 9, 2026: **program deployed; real test-USDC CLI purchase, 70/30 payouts, installation and recovery/reinstall verified**. The owner completed the official SOL and Circle USDC faucets. Local SBF ProgramTest results and mock payments remain separate evidence. The public Alibaba free catalog still has checkout disabled.

Use test funds only. Keep keypair files, `.env.local`, the vault master key, and session private keys out of repository files, recordings and logs.

## Verified test funding

- Devnet genesis: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
- Dedicated issuer `AcJHD71UwABBAKa39z1jvrrpHdR7JF9dacJJH1dWizmu` received two finalized 5 SOL airdrops: [first transaction](https://explorer.solana.com/tx/2hhsYBVi2toCAjtSkEunLFkBYPahizE7fUSJ9xwGoc1PXpivALeWFNYvtKVjtc1rYHCw1mQZtnBEuWpG7RwuE7vi?cluster=devnet), [second transaction](https://explorer.solana.com/tx/2yXHXEsjPDAXDGhQfn2bZodV1wRpZkYm3r3Ap6wWbagcBHa5ioqPztH6qfBDTdKuBFprp7sMieaUccqpcBcVYVCT?cluster=devnet).
- One [finalized funding transaction](https://explorer.solana.com/tx/3X1FDw5KhyRLM6QBRVjvnKKoisM4q4Fju4D7oZs5skfQPLviiyEioLCtTrU6JYmzejv8YJsMwiaokTtshHLUAQpo?cluster=devnet) supplied each author and buyer with 0.1 SOL. Its fee was 5,000 lamports. The issuer balance immediately afterward was 9.699995 SOL.
- Buyer `8fHzM29cBkrCjk8mvzYTg7a5FgydvM5i8axKmB79RfX` received 20 test USDC at the configured Circle Devnet mint in a [finalized transaction](https://explorer.solana.com/tx/5pASopc8iMY66dw2y6U4TmL9a7THQFzLFPRv4GcUQvoNBhSV6H8pZLwTKxn2UhFRo2sXRvnCruPfPG7oCKFvZDZ2?cluster=devnet). The token balance was verified as 20,000,000 base units, with six decimals.

These transactions verify faucet delivery, cluster identity, transfers and test-account funding. The separate purchase evidence below verifies a Skill purchase, author payouts and a finalized wallet/version grant.

## Verified public Devnet purchase — October 9, 23:40 Shanghai

- [Deployed program](https://explorer.solana.com/address/AXwhEjRZEqA8Yz6C5gyToudg65UZie8nXuJvbd83LKQu?cluster=devnet): `AXwhEjRZEqA8Yz6C5gyToudg65UZie8nXuJvbd83LKQu`; [deployment transaction](https://explorer.solana.com/tx/61kBkeFNH1x5bsAP4wwnzGr1en77MinJqAHrya6a5dbVkr6ncU3b4NfzRfUHwgXJs9htZUSSso8ZA8f8DoMxhL44?cluster=devnet) finalized. The executable program, upgrade authority and every byte of the deployed ELF were checked against CI source `f725265891260b3ee44afd25225f4314bd4fc3aa`. Artifact SHA-256: `0420cd7561f32883ea92220a652ccaf5f411eb8dd2b50ebed5ddb1912b5a8fd9`; 314,968 bytes.
- Immutable test version: `75e0f6030a4233b7ce1b85661d7a9204bf0b57bd1024ec32b7972a612d8faa2a`; version PDA `A5QDqv7zqB6Mws77bWVDnPgqdQDHjyeZRRpaaJubKoGS`. Both dedicated test authors approved 7,000/3,000 basis points before payment.
- [register version](https://explorer.solana.com/tx/YKp9z6rYrvrpYZdny7uBJixutX6BvizH2sfqAR8MXUoQ9wnF2581T7gwk1AVA773DYtaR5TcSmt2GFThXgj63R4?cluster=devnet): finalized, fee 5,000 lamports. Signer `AcJHD71UwABBAKa39z1jvrrpHdR7JF9dacJJH1dWizmu`.
- [approve version](https://explorer.solana.com/tx/2iT754UJrAoWv5Q2MLZrqkt1Nmgry6Pqgv8X2GW3cvtQN9TaACqxwoxduFNiRyoEbKXMMQ4gwgM9CBajHddHVh3D?cluster=devnet): finalized, fee 5,000 lamports. Signer `965U51Yg2UMreesDHXervVpoXn9xf5WUhC62UN67atn7`.
- [approve version](https://explorer.solana.com/tx/y6XxKuq8teAPdSwrqDUnGU4PZtNrdQN2xommKGBCa5cq2v2RN2ncYKvXQHPd96RPdXtPSYTuC6c5yn1yFx6wn5t?cluster=devnet): finalized, fee 5,000 lamports. Signer `E2PNPLiS6uj3qrjM4oKzYjRjS7319PNq2F1yYQPLYutE`.
- [pay](https://explorer.solana.com/tx/2SvnuE5htfUyJp7vz3C5CEuvNNjAVFsCDsNGKe8pUvB22iryeC6rypgynAr431RfXgYK3fwLPNc5VbE7FnansDyd?cluster=devnet): finalized, fee 5,000 lamports. Signer `8fHzM29cBkrCjk8mvzYTg7a5FgydvM5i8axKmB79RfX`.
- [settle](https://explorer.solana.com/tx/4WGi6LH2GW2JMdA7gjaTjAsNStpvnEXK9DdW9o4dtpL8SReGMBpWwhuJ9SA1v8eG8xCn9wnpVEmcyow3nkzQ3Amg?cluster=devnet): finalized, fee 5,000 lamports. Signer `AcJHD71UwABBAKa39z1jvrrpHdR7JF9dacJJH1dWizmu`.

| Test wallet    |  Before | After purchase | After recovery/reinstall |
| -------------- | ------: | -------------: | -----------------------: |
| Buyer          | 20 USDC |        19 USDC |                  19 USDC |
| Author A (70%) |  0 USDC |       0.7 USDC |                 0.7 USDC |
| Author B (30%) |  0 USDC |       0.3 USDC |                 0.3 USDC |

The order PDA `96C36gGzdgZkmuJYWms4CoHMCJZFcwFvkgMhLacGN2aC` was independently read as `granted` on finalized Devnet state. The encrypted package installed through the actual API/CLI path into a fresh directory. All five files matched the source bytes. A second local delivery session used the same wallet/version grant and a fresh encryption key; no second payment or payout occurred.

The reinstall request exceeded the CLI’s 30-second HTTP timeout during synchronization. `resume` completed that same private session successfully. This is recorded as an observed transport failure; the server’s zero failure-event metric does not erase it. Payment and settlement cost 10,000 lamports in transaction fees and deposited 5,735,320 lamports for the inspected new order/escrow/author token accounts. These figures exclude program deployment, registration, approvals and funding.

These are test accounts controlled for engineering validation, not additional team members, customers or revenue. The API ran on local loopback; the blockchain transactions are public Devnet. Browser wallet-extension purchase, interruption after payment submission, timeout refund and hosted paid checkout remain outstanding. The public Alibaba catalog still has checkout disabled.

Machine-readable public addresses, signatures, balances, file comparisons and failures: [DEVNET-EVIDENCE.json](DEVNET-EVIDENCE.json). No private keys, delivery keys or recovery-session contents are included.

## Preparation

1. Use a dedicated test deployment copy. `pnpm run setup` creates a new program identity and key vault; it refuses to replace existing configuration. Build the program after setup so its declared ID matches the generated keypair.
2. Follow the current build/deploy commands in [the Devnet guide](README.zh-CN.md#solana-devnet). Point `SOLANA_RPC_URL` to Devnet and verify the genesis hash is `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
3. Obtain sufficient test SOL for deployment and the issuer's account creation/settlement costs. Authors and buyer need test SOL for their signed transactions. The buyer also needs test USDC at mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
4. Back up the key vault separately from the SQLite data. Keep the API and worker on the same durable data directory. Run one persistent service instance for this SQLite MVP; do not assume ephemeral serverless storage will preserve purchased keys.
5. Add the dedicated test publisher to `PUBLISHER_ALLOWLIST`. Use operator review, or `MODERATION_REQUIRED=0` only in an isolated loopback test environment. Run seed or publish the example and have every author approve the version. Record the immutable version identity and both author wallet addresses.

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

## Remaining acceptance

- Browser wallet-extension purchase and hosted paid checkout.
- Recovery after interruption specifically between payment submission and grant.
- A separate public Devnet timeout refund, with an early-refund rejection and rejected post-refund claim.
- Off-host encrypted backup restoration before enabling a hosted paid beta.
