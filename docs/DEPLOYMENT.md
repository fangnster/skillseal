# Deployment

> Current October 10 acceptance: Hosted Solana Devnet checkout is enabled on the existing Alibaba server. Public HTTPS CLI purchase, exact 70/30 payouts, five-file installation, browser session recovery, a real 600-second timeout refund and encrypted off-host paid-vault restoration passed. Phantom browser purchase and exact ZIP recovery also passed. Test funds only; no mainnet payments or revenue claims. See [hosted evidence](ONLINE-ACCEPTANCE.md).

The [Alibaba Cloud platform](https://skillseal-47-236-112-184.sslip.io/) is live on the selected existing server. Hosted Solana Devnet checkout is enabled on the existing Alibaba server. Public HTTPS CLI purchase, exact 70/30 payouts, five-file installation, browser session recovery, a real 600-second timeout refund and encrypted off-host paid-vault restoration passed. Phantom browser purchase and exact ZIP recovery also passed. Test funds only; no mainnet payments or revenue claims. The existing application still returns HTTP 200. Runtime mounts retain the original keys and avoid image rebuilds on this 1 GiB host. See [current acceptance](ONLINE-ACCEPTANCE.md) and the existing-host runbook.

The complete 0.2 website can run on a selected existing Alibaba Cloud ECS or Simple Application Server. See [deploy/aliyun/README.md](../deploy/aliyun/README.md) for Docker, persistent storage, HTTPS, a shared existing proxy and a prebuilt runtime for small hosts. Start with `PAYMENT_BACKEND=disabled`: the free upload/review/share/download flow runs without chain funding, while test-priced drafts remain unavailable for purchase. An operator public signing address is required. This configuration does not create cloud resources or authorize new spending.

# Public website and persistent marketplace deployment

The public website is a static product entry point and free MIT installer distribution. Build it with `pnpm run build:distribution`; publish `site-dist/`. `render.yaml` configures an optional Render static service. The GitHub Actions workflow publishes `site-dist/` to GitHub Pages after app and contract checks pass; enable GitHub Actions as the Pages source in repository settings. Relative asset paths and sample distribution URLs support a project subpath. It does not run a mock ledger or pretend to accept payments. The download package contains only client code, dependencies and MIT material; no runtime secrets or database.

The separately hosted Next.js marketplace runs the actual API, encrypted SQLite key vault and settlement worker. It requires a persistent disk mounted to one instance. A static site, serverless function, or ephemeral free web service cannot safely persist the current vault. Do not expose the local mock backend remotely.

## Persistent service preparation

1. Complete `docs/DEVNET-ACCEPTANCE.md` program deployment and confirm the configured program is executable on public Devnet.
2. Approve the hosting plan and disk cost. `deploy/render-marketplace.yaml` is a prepared configuration, not an automatic instruction to create paid resources.
3. Set `SOLANA_PROGRAM_ID` to the verified deployed program, `PAYMENT_BACKEND=solana`, `PERSISTENT_STORAGE=1`, and an absolute `DATA_DIR` on the mounted disk. Render's `RENDER_EXTERNAL_URL` supplies the public origin, or set `APP_ORIGIN` explicitly.
4. The first hosted start creates a vault master key and dedicated issuer key on the persistent disk with owner-only permissions, unless a master key/issuer was supplied securely. An existing database with missing keys causes startup to fail; keys are never silently replaced. Back up the database, bundles, master key and issuer key together, encrypted and off-host. Protect operator access to the disk: file permissions do not protect against a compromised host.
5. Fund only the dedicated issuer/author/buyer Devnet test wallets. Never use a mainnet wallet. Publish a version with the correct hosted issuer and obtain every author's on-chain approval.
6. `pnpm run start:hosted` starts Next on `0.0.0.0:$PORT` and the settlement worker against the same disk. A child failure stops the service. `/api/health` returns readiness without keys or filesystem paths.
7. Test public wallet purchase, finalized license/payout, CLI installation, recovery without repeat payment, refund after expiry, restart persistence and backup restoration. Only then enable/link public paid checkout from the website and update its status.

Render serves HTTPS. Keep one replica for the SQLite vault. Disk state is unavailable during build; generate download assets during build and initialize runtime keys at startup. A disk attached to a different worker service does not share the vault.

## Verification scope

Local tests and the isolated demo cover the purchase protocol and encrypted installation. Website/sample installation tests cover the public distribution path. Neither alone proves that public Devnet settlement or production backups are working. Record the exact URL, commit, program address, transaction signatures and recovery evidence in `VALIDATION.md` after acceptance.

Render deployment was attempted on October 9, 2026 and returned HTTP 402 requiring a payment card, including for the static site. No Render service or paid resource was created.
