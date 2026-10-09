# SkillSeal installation

> Current October 10 acceptance: Hosted Solana Devnet checkout is enabled on the existing Alibaba server. Public HTTPS CLI purchase, exact 70/30 payouts, five-file installation, browser session recovery, a real 600-second timeout refund and encrypted off-host paid-vault restoration passed. Phantom browser purchase and exact ZIP recovery also passed. Test funds only; no mainnet payments or revenue claims. See [hosted evidence](ONLINE-ACCEPTANCE.md).

Requires Node.js 24 or newer. The public website's Install section generates the exact command using its own HTTPS address.

```sh
npm install --ignore-scripts -g https://YOUR_SITE/downloads/skillseal-cli-0.2.0.tgz
skillseal sample --server https://YOUR_SITE --destination ./skills/research-brief
```

Open `skills/research-brief/SKILL.md` in your agent tool. Provide your own source notes; use `references/review-checklist.md` to review the resulting brief. The sample is MIT licensed and includes fictional inputs and a reference output. It needs no wallet or payment and executes no scripts. The installer pins its SHA-256 hash, rejects unsafe paths and refuses to overwrite an existing destination. Install into a different directory to try it again. Installed files work offline; the agent model itself may still need a network connection.

If global npm installation needs administrator access, use a user-owned prefix:

```sh
npm install --ignore-scripts --prefix ./skillseal-tool https://YOUR_SITE/downloads/skillseal-cli-0.2.0.tgz
./skillseal-tool/node_modules/.bin/skillseal sample --server https://YOUR_SITE --destination ./skills/research-brief
```

## Paid version purchase and recovery

These commands target a separately configured marketplace API; the static website's free example does not create a paid license. Hosted Devnet test checkout is enabled; see ONLINE-ACCEPTANCE.md for exact scope.

```sh
skillseal list --server https://YOUR_MARKETPLACE
skillseal install VERSION_HASH --server https://YOUR_MARKETPLACE --destination ./skills/purchased-version
# Complete the browser checkout using Devnet test funds.
skillseal resume --session /path/to/skillseal-session.json --destination ./skills/recovered-version
```

CLI-created recovery sessions are stored in `.data/sessions/` by default, with owner-only permissions. Browser checkout downloads `skillseal-session.json`. Keep that file private: it contains a decryption private key. Resume uses the saved order; do not pay again while finality is pending. Reinstall an already licensed version with the same buyer wallet into a new destination to recover access without a second purchase.

Publication, author approval and refunds require an explicit Devnet wallet keypair. `skillseal --help` shows command syntax. The tool does not read a server `.env.local` file and includes no server keys, database or creator private files.
