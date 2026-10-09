# SkillSeal demo guide

Use this script to record a short product demo or walk a reviewer through the project. The current Crypto World's Fair form requires a live product video up to three minutes and a separate pitch video up to two minutes. The published product walkthrough is 2:54; see PITCH.md for the founder pitch.

## Public website and free installation

The public website provides product meaning, workflow, example preview, creator guidance and two installation commands. Install the standalone CLI archive with npm, then run `skillseal sample --server WEBSITE_URL --destination ./skills/research-brief`. The archive contains compiled JavaScript and does not require a server environment file. Use a new directory for repeat installation. The free MIT sample is directly distributed and does not exercise payment or create a paid license.

The [published product video](https://youtu.be/fCNz1DUwwtM) first shows the actual public website and installation, then distinctly labels the implemented paid purchase/recovery demonstration as local mock. Public Devnet remains pending. The verified duration is below three minutes. The original product video is [available on YouTube](https://youtu.be/eSiJYIZ4oU8); retain it as a previous version alongside the new walkthrough.

Public website: [https://fangnster.github.io/skillseal/](https://fangnster.github.io/skillseal/). Clean public HTTPS installation and reinstall were verified on October 9. The console scenes are edited representations of recorded results, and narration uses a generic synthetic voice; no founder photograph appears in the product video.

## Before recording

Install Node.js 24+ and pnpm 11. Run `pnpm install --frozen-lockfile` in a fresh project copy. Keep `.env.local`, `.data`, wallet secrets and downloaded session files out of recordings and uploads. Public wallet addresses and version hashes are safe to show.

Choose the demo mode explicitly:

| Mode                      | What to say                                                         | Prerequisites                                                                      |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Local mock, available now | “This is the local product flow; payment and splits are simulated.” | `setup --mock`, `seed`, `dev`                                                      |
| Public Devnet, pending    | “This purchase uses test USDC on Solana Devnet.”                    | Deploy and fund the program, issuer, authors and buyer; complete Devnet acceptance |

Do not present a local mock order as a Devnet transaction. The browser has a visible environment badge.

## Three-minute walkthrough

| Time      | Screen or action                                                                          | Narrative                                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:25 | Marketplace and one Skill version                                                         | Agent developers want paid workflows that stay local. SkillSeal sells a permanent version license.                                                                                                                                    |
| 0:25–0:45 | Research Brief card and 70/30 authors                                                     | Each author approves a fixed split before publication.                                                                                                                                                                                |
| 0:45–1:25 | CLI install and checkout                                                                  | Download ciphertext before paying. Wallet identity and the local encryption key are separate.                                                                                                                                         |
| 1:25–1:55 | Granted order and installed `SKILL.md`                                                    | Settlement records a license and splits funds atomically; then the installer decrypts locally. In this mock demo the settlement is simulated.                                                                                         |
| 1:55–2:20 | Install again into another directory                                                      | Same wallet, same version, no second purchase. A new encryption key supports recovery.                                                                                                                                                |
| 2:20–2:40 | Open the installed Skill, template and fictional reference brief with the service stopped | Installed assets remain available offline. Show the evidence-to-decision workflow and its output structure; the reference brief is a hand-written fictional example, not an Agent benchmark. Installation never runs package scripts. |
| 2:40–2:45 | Validation record                                                                         | Solana's value is settlement and auditable revenue sharing. The service is trusted for keys; decrypted content can still be copied.                                                                                                   |

## Repeatable local commands

In terminal A:

```sh
pnpm run setup --mock
pnpm run seed
pnpm run dev
```

In terminal B:

```sh
pnpm run cli list
# Copy an active VERSION_ID from the output.
pnpm run cli install VERSION_ID \
  --demo-wallet .data/demo-buyer.json \
  --destination ./skills/first-install
pnpm run cli install VERSION_ID \
  --demo-wallet .data/demo-buyer.json \
  --destination ./skills/reinstall
pnpm run cli metrics
```

Show the CLI's installed message. With `--demo-wallet`, checkout is automatic: copy the order ID from the recovery session's filename and open `http://127.0.0.1:3000/checkout/ORDER_ID` to show the granted state. Show only the filename, not the private session contents. Check the completion metrics and that the second install did not create new author payouts. Then stop the web process and open `skills/first-install/SKILL.md` in your editor.

The mock checkout does not accept an arbitrary browser “paid” button. The `--demo-wallet` flow signs a challenge and funds through the explicitly gated local API. For browser-first Devnet purchasing, connect Phantom or Solflare, keep the downloaded `skillseal-session.json` private and use the `resume` command printed on the page.

For a console-only fallback that needs no running server:

```sh
pnpm run demo
```

Expected output includes `LOCAL MOCK`, `balancesBaseUnits: ["700000", "300000"]` and completed session metrics. The script checks those balances and the installed Skill before exiting.

## Devnet evidence to collect

Follow the [Devnet acceptance runbook](DEVNET-ACCEPTANCE.md) in a dedicated test copy. Before calling the demo a public-chain result, record:

1. The deployed program address and deployment transaction.
2. Both authors' approval transactions and immutable version identity.
3. Buyer payment and issuer settlement transactions reaching `finalized`.
4. The two author USDC balance changes, permanent license state and successful local installation.
5. Recovery after closing checkout, recovery with a new encryption key, and reinstall without another payment.
6. A separately funded unsettled order: early refund rejection, then buyer-signed refund after 600 seconds.

Update `VALIDATION.md` with actual signatures and evidence. Use [Solana Explorer](https://explorer.solana.com/?cluster=devnet) with the Devnet cluster selected. No public deployment address or transaction signature is supplied by this starter.

## Troubleshooting

- **Port 3000 is busy:** choose a free port and change `APP_ORIGIN` in `.env.local` to match, before `seed`; then run `pnpm run dev --port PORT`. Origin is part of signature validation.
- **Destination exists:** choose a new directory; the installer deliberately refuses to overwrite.
- **Setup reports existing configuration:** use a fresh copy. Never delete keys to “reset” a vault whose content you still need.
- **Devnet faucet fails:** obtain test SOL through an available official route and check the required account funding; keep the demo labelled local until a real Devnet purchase succeeds.
- **Payment confirmation times out:** preserve the session and sync/resume it. Avoid starting a second payment while finality is pending.
