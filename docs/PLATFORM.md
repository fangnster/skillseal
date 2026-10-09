# Publishing, sharing and installing a Skill

> Current October 10 acceptance: Hosted Solana Devnet checkout is enabled on the existing Alibaba server. Public HTTPS CLI purchase, exact 70/30 payouts, five-file installation, browser session recovery, a real 600-second timeout refund and encrypted off-host paid-vault restoration passed. Phantom browser purchase and exact ZIP recovery also passed. Test funds only; no mainnet payments or revenue claims. See [hosted evidence](ONLINE-ACCEPTANCE.md).

Live free platform: [https://skillseal-47-236-112-184.sslip.io](https://skillseal-47-236-112-184.sslip.io/). Open `/creators` to publish, share an approved version page, and download a ZIP or copy its CLI command. [Cloud acceptance](CLOUD-ACCEPTANCE.md) is complete; Devnet test checkout is enabled.

The full Next.js application adds browser Creator Studio (`/creators`), reviewed version pages (`/skills/<version hash>`), operator inspection/review (`/manage`), and purchase recovery (`/library`). These pages require a running API and persistent vault. GitHub Pages remains the static introduction and free-example installer; it does not host the API.

## Upload and release

1. Open **Publish**. Connect a wallet, or create a local identity for free publishing. Save the private identity file; import it on a later visit. Only the public address is shared. A local free identity is not a funded wallet and cannot approve Devnet transactions.
   File buttons and selection messages are English regardless of the browser's locale. Use **Choose Skill folder** for the complete package or **Choose SKILL.md** for one file. The system file dialog uses your operating system language.
2. Choose a folder with a nonempty root `SKILL.md` and optional reference/template/example files, or choose one `SKILL.md`. The app validates portable paths, duplicate names, collisions, 500-file and 10 MiB limits. ZIP upload and symlinks are unsupported. Files are not executed.
3. Set Skill ID, display name, semantic version, description, free/paid terms, license and up to five unique creator addresses. Shares total exactly 100%; the publisher is one of the authors. Paid prices use six-decimal test-USDC units. The public MIT sample remains freely redistributable.
4. Preview the exact terms, confirm rights and sign the version. Browser AES-256-GCM encryption is compatible with the existing CLI. The API verifies the signed manifest, hashes and bundle, encrypts the content key at rest, and saves an immutable version.
5. Each author signs approval in their Creator Studio. The configured operator signs a single-use challenge to inspect package files and separately approves or rejects the listing. New free downloads require both author approval and operator approval. The operator sees package contents because the service already holds the content keys.
6. Share the exact version's detail-page URL. Edit content, price, shares or license by publishing a new version. The previous version identity cannot be overwritten.

The public catalog lists active releases. A draft's direct detail URL displays its actual pending/rejected/checkout status. Public descriptions, terms and public author addresses are visible; private signing files, vault master keys and purchase sessions are not public assets. Each publisher is limited to ten new releases per day; the default ciphertext storage cap is 256 MiB and the API also bounds request sizes and rates. Operator review is required for remote deployments.

## Free download and installation

An approved free release has a signed plaintext SHA-256 in its manifest. The server verifies decrypted content before serving it; the browser and CLI verify the same digest before local extraction. Buyers need neither an account nor a wallet. Browser download creates a portable ZIP; extract it and load `SKILL.md` in your agent. The installer refuses existing destinations and executes no package scripts.

```sh
npm install --ignore-scripts -g https://YOUR_MARKETPLACE/downloads/skillseal-cli-0.2.0.tgz
skillseal install VERSION_HASH --server https://YOUR_MARKETPLACE --destination ./skills/my-skill
```

Use the exact commands displayed by the actual deployed site. The original `skillseal-cli-0.1.1.tgz` URL is retained as a download compatibility alias for the 0.2.0 archive so already-shared installation instructions continue to resolve.

## Test-priced versions

Free catalog mode (`PAYMENT_BACKEND=disabled`) accepts prepared test-priced drafts and signed author intent, but does not activate them, create paid orders, record a simulated payment or grant a paid license. Public Devnet checkout must be enabled and accepted separately. Hosted paid creators require operator onboarding through `PUBLISHER_ALLOWLIST`; the issuer otherwise could pay for uncontrolled registrations.

When Solana checkout is enabled, the reviewed release needs each author's finalized chain approval. A wallet signs the exact version authorization and validated Devnet transaction. Payment escrows the fixed price; finalized settlement records the permanent wallet/version grant and creator payouts atomically. The MVP has no commission, subscription or per-run charge. Reinstallation of the same purchased version with the same buyer wallet does not charge again. New versions have separate licenses. Only test funds are supported; the code does not collect mainnet money or fiat payments.

Browser checkout downloads a private recovery session before payment. After a grant, choose it in checkout or `/library` to decrypt and download locally, or use `skillseal resume`. The session private key remains in the browser; it is not posted to the API. The API releases only a sealed content key after rechecking settlement authority. Lost sessions can be replaced by CLI installation with the same licensed buyer. Unsettled escrow is refundable by the original buyer after ten minutes; granted licenses have no timeout refund.

## Deploy

Use [the Alibaba Cloud runbook](../deploy/aliyun/README.md) for a selected existing server, HTTPS proxy, persistent vault and operator identity. Read [Devnet acceptance](DEVNET-ACCEPTANCE.md) before activating test checkout. A production mock backend remains rejected. Source/build validation and local mock purchase tests are separate from a public deployment and real-chain acceptance.
