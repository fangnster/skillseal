# SkillSeal demo guide

Use this script to record a short product demo or walk a reviewer through the project. The current Crypto World's Fair form requires a live product video up to three minutes and a separate pitch video up to two minutes. The current live-cloud product walkthrough is approximately 2:17; see PITCH.md for the founder pitch.

## Live cloud walkthrough 0.2 — current video

[Watch the live cloud walkthrough](https://youtu.be/YWXcdWWev34) (136.12 seconds, under three minutes, Unlisted). It uses actual public Alibaba Cloud pages, product meaning/architecture diagrams and an edited representation of verified HTTPS CLI output. Generic synthetic narration and rendered captions are disclosed. It shows the live Creator Studio, approved Research Brief share/download page, exact package installation and restart persistence. Public paid checkout remains disabled. See [cloud acceptance](CLOUD-ACCEPTANCE.md).

## Earlier local walkthrough 0.2

[Watch the 0.2 product demo](https://youtu.be/374T4FpqwEI) (166.00 seconds, under three minutes, Unlisted). It shows product meaning, the current architecture, actual local upload/preview, operator package inspection, immutable share/download pages and a newly installed standalone 0.2 CLI. The CLI installed the reviewed version, matched file bytes and refused an existing destination. English captions are rendered; narration is generic synthetic speech. Product visuals contain no founder photograph.

The entire video is labelled **local functional demo; cloud acceptance pending**. The free catalog has checkout disabled and produces no simulated paid grants. Paid settlement and recovery tests remain distinct from public Solana Devnet acceptance. The later [Alibaba Cloud acceptance](CLOUD-ACCEPTANCE.md) passed HTTPS, storage, delivery and original-site checks. This earlier video retains its original local-demo label.

## Previous website and free installation walkthrough

The public website provides product meaning, workflow, example preview, creator guidance and two installation commands. Install the standalone CLI archive with npm, then run `skillseal sample --server WEBSITE_URL --destination ./skills/research-brief`. The archive contains compiled JavaScript and does not require a server environment file. Use a new directory for repeat installation. The free MIT sample is directly distributed and does not exercise payment or create a paid license.

The [previous 0.1 product video](https://youtu.be/fCNz1DUwwtM) first shows the actual public website and installation, then distinctly labels the implemented paid purchase/recovery demonstration as local mock. Public Devnet remains pending. The verified duration is below three minutes. The original product video is [available on YouTube](https://youtu.be/eSiJYIZ4oU8); retain it as a previous version alongside the new walkthrough.

Public website: [https://fangnster.github.io/skillseal/](https://fangnster.github.io/skillseal/). Clean public HTTPS installation and reinstall were verified on October 9. The console scenes are edited representations of recorded results, and narration uses a generic synthetic voice; no founder photograph appears in the product video.

## Before recording

Install Node.js 24+ and pnpm 11. Run `pnpm install --frozen-lockfile` in a fresh project copy. Keep `.env.local`, `.data`, wallet secrets and downloaded session files out of recordings and uploads. Public wallet addresses and version hashes are safe to show.

Choose the demo mode explicitly:

| Mode                      | What to say                                                         | Prerequisites                                                                      |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Local mock, available now | “This is the local product flow; payment and splits are simulated.” | `setup --mock`, `seed`, `dev`                                                      |
| Public Devnet, pending    | “This purchase uses test USDC on Solana Devnet.”                    | Deploy and fund the program, issuer, authors and buyer; complete Devnet acceptance |

Do not present a local mock order as a Devnet transaction. The browser has a visible environment badge.

## Previous 0.1 video timeline

| Time      | Screen or action                       | What the viewer sees                                                                                                                                                    |
| --------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Product meaning diagram                | Buyer delivery/recovery needs, creator shares, and the website + CLI + API product shape.                                                                               |
| 0:20–0:42 | Payment architecture                   | Atomic version license and creator payouts, finalized key delivery, trusted service and pending public Devnet acceptance.                                               |
| 0:42–1:06 | Actual public website                  | Product explanation and the free MIT Research Brief package.                                                                                                            |
| 1:06–1:29 | Actual installation page               | Exact public URL, npm tool installation and `skillseal sample` commands.                                                                                                |
| 1:29–1:52 | Recorded HTTPS installer results       | Clean npm installation, pinned sample integrity, fresh-directory install, reinstall and overwrite refusal. The console is an edited representation of verified results. |
| 1:52–2:14 | Separate local mock purchase/recovery  | One simulated payment, 70/30 shares and no second payment for the licensed wallet/version. No public-chain transaction is claimed.                                      |
| 2:14–2:36 | Installed package files                | Instructions, template and review checklist remain local. Example evidence is fictional and hand-written.                                                               |
| 2:36–2:54 | Actual website workflow and validation | 27 TypeScript tests and clean packaged installation; public paid Devnet checkout is the next acceptance milestone.                                                      |

The uploaded file is 174.21 seconds. English captions are rendered in the video. Generic synthetic narration, diagrams and actual website captures are disclosed in the YouTube description.

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
