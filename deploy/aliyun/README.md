# SkillSeal on an existing Alibaba Cloud server

Use an existing ECS or Simple Application Server with Docker Compose v2, persistent local storage, a reachable domain and outbound HTTPS. This setup creates no Alibaba Cloud resource. Do not reset an existing server, replace its disk, displace services on ports 80/443, or enable new billing while preparing deployment. Inspect the account and selected server first. If ports 80/443 already serve another site, integrate into its existing proxy or choose another authorized host.

Start in **free catalog mode**: uploads, file validation, encrypted storage, signed author approvals, operator file inspection/review, stable share pages, free ZIP download, CLI installation and recovery tools are available. `PAYMENT_BACKEND=disabled` has no simulated ledger and cannot create paid grants. Paid drafts can be prepared, but they cannot be bought. The SQLite vault, issuer and master key live in one persistent volume shared by web and worker.

## Prepare the operator and domain

1. Open the locally reviewed Creator Studio. Create a free publishing identity, save its private identity file and copy only its public address. Set that public address as `ADMIN_WALLET`; never upload the private file to GitHub, paste it into a public command, or place it in the container build context.
2. Choose an existing, authorized server. Check disk capacity, Docker, port usage and existing workloads. Point the selected domain to its public IP. Allow inbound 80/443 for this site's HTTPS proxy; keep app port 3000 private. Follow Alibaba Cloud's domain and hosting requirements for the chosen region.
3. Clone the public repository to a new directory on the selected server. Do not overwrite another application.

```sh
git clone https://github.com/fangnster/skillseal.git
cd skillseal/deploy/aliyun
cp .env.example .env
chmod 600 .env
# Edit SKILLSEAL_DOMAIN and ADMIN_WALLET; keep PAYMENT_BACKEND=disabled.
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Caddy obtains and renews HTTPS when the domain and ports are reachable. The app refuses an invalid reviewer, non-HTTPS public origin or unconfirmed persistent storage. Startup creates missing vault keys only for a new database; a database with a missing master/issuer key is refused. Do not use `docker compose down --volumes`: it destroys the vault and purchases.

## Acceptance before advertising the URL

- HTTPS `/api/health` returns `ready` and backend `disabled`.
- Upload a fictional free Skill in `/creators`, sign its author approval, inspect the files in `/manage`, and approve with the configured reviewer.
- Open its `/skills/<signed-version-hash>` URL from a second browser. Download and inspect the ZIP and install with the exact command displayed there. No wallet or payment is required to install free content. A new version receives a new URL.
- Reject a pending/approved listing and verify new free downloads are blocked. A non-reviewer, reused review challenge and altered package must fail.
- Restart only the app and verify the same release, keys and approvals survive. Back up and restore in a separate test volume before publishing a paid beta.

## Backups and updates

Stop the app to take a consistent private backup of the entire vault volume (SQLite, bundles and keys) using the existing server's backup method. Encrypt backups, store a recovery copy separately, and verify restoration in a separate volume. A chain receipt cannot reconstruct a lost content master key. Restart the app after backup. Keep the same vault volume when rebuilding; do not regenerate keys or initialize over it.

```sh
docker compose stop app
# Take the private, encrypted volume backup using the selected server's backup tooling.
docker compose start app
# Later update the source, retaining the named volumes:
docker compose up --build -d
```

## Enable Devnet checkout later

Only after the public program is deployed, the issuer has free test SOL, authors have test USDC, and `docs/DEVNET-ACCEPTANCE.md` passes, set `PAYMENT_BACKEND=solana`, its actual program ID and `PUBLISHER_ALLOWLIST`. A production mock backend is rejected. Paid publishing uses issuer funds and stays limited to onboarded wallets. Every author signs chain approval after operator review; off-chain approval of a prepared draft does not replace chain approval. The app and worker use the same vault. Mainnet collection, fiat payments and real-money revenue are not part of this deployment.

References: [Alibaba Cloud Docker deployment](https://www.alibabacloud.com/help/en/simple-application-server/use-cases/deploy-and-use-docker), [SSL and application hosting](https://www.alibabacloud.com/help/en/simple-application-server/overview-1), [domain requirements](https://www.alibabacloud.com/help/zh/simple-application-server/product-overview/usage-notes). Use the installation procedure for an existing host; this guide does not authorize the official tutorial's server purchase or reset steps.

## A 1 GiB host with an existing HTTPS proxy

Compile the runtime on GitHub's Linux runner, then use the public `downloads/skillseal-server-0.2.0.tgz` archive and verify its SHA-256 against `downloads/release.json`. Check `serverSourceCommit` against the reviewed public commit. The archive includes compiled pages and runtime source, excludes the vault, environment files, private identities and build cache, and does not contain node_modules. Extract into a new release directory and install dependencies for the server's OS with `Dockerfile.prebuilt`; do not compile Next on the 1 GiB server.

When the inspected host already has Caddy on 80/443, use the prebuilt and shared-proxy overrides. Validate the actual Compose configuration before starting only this project. Connect the inspected existing Caddy container to the new `skillseal_default` network; the SkillSeal app does not join the original application's private network. Preserve the existing proxy configuration and all existing site blocks. Add one reviewed site block to its existing Caddyfile for the selected SkillSeal domain with `reverse_proxy skillseal-app:3000`; validate before a graceful reload. Do not restart or replace the original application. This requires the selected domain, inspected proxy mount path and network; placeholders are not a deployed URL.

```sh
docker compose -f compose.yaml -f compose.prebuilt.yaml -f compose.shared-proxy.yaml config --quiet
docker compose -f compose.yaml -f compose.prebuilt.yaml -f compose.shared-proxy.yaml up --build -d app
# After confirming the actual existing proxy container name:
docker network connect skillseal_default EXISTING_CADDY_CONTAINER
```

The prebuilt mode is an alternative to the full source Dockerfile. Local validation of compiled app pages is distinct from building and running a Linux container on the selected server.
