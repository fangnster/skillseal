# SkillSeal

**Find an AI work guide. Install it locally. Pay its creators when it is a paid version.**

A **Skill** is a reusable set of instructions, templates and reference files for an AI assistant. For example, a Research Brief Skill helps the assistant turn your notes into a structured brief and check the result. SkillSeal distributes these files; you use them with your own AI tool.

[Open the website](https://skillseal-47-236-112-184.sslip.io/) · [中文介绍](docs/README.zh-CN.md) · [Watch the product demo](https://youtu.be/p0zld2clCl8)

## The problem

A useful workflow is often scattered across prompt links, folders and messages. Developers need the complete package and a clear version. Creators need a way to deliver it, get paid, and share that payment when several people contributed.

## How it works

1. **Find and install.** Choose a Skill on the website. Download its ZIP or use the standalone installer. Free Skills need no wallet.
2. **Publish and share.** Upload a package, set its license and price, and share its version link after review. Collaborators approve their shares first.
3. **Pay and recover.** Paid versions use a wallet payment. A completed purchase can be installed again without paying twice. Unsettled payments become refundable after ten minutes.

## Why Solana?

Solana is the payment and receipt layer. One transaction records access to the chosen version and pays the agreed collaborator shares together. Our test used **1 test USDC**, split **0.7 / 0.3** between two collaborators. USDC is a dollar-denominated token; the demo uses test tokens with no real-money value.

This first version targets developers who already use wallets. Traditional payment services can also support delivery and splits. SkillSeal does not yet give autonomous agents a spending budget or permission system.

## Try it free

The catalog includes Research Brief and three free Apache-2.0 Skills from Anthropic: Frontend Design, Internal Communications and Brand Guidelines. [Sources and installation commands](docs/CURATED-SKILLS.md).

Requires Node.js 24+:

```sh
npm install --ignore-scripts -g https://fangnster.github.io/skillseal/downloads/skillseal-cli-0.2.0.tgz
skillseal sample --server https://fangnster.github.io/skillseal --destination ./skills/research-brief
```

Load `skills/research-brief/SKILL.md` into your AI tool, supply your own notes, and review the result. SkillSeal does not run the AI model for you.

## What is working today

The website is live. Download, purchase, agreed payouts, recovery, timeout refund and backup restoration passed verification. **Paid checkout is Solana Devnet only: test money, no claimed customers or revenue.** [Recorded evidence](docs/ONLINE-ACCEPTANCE.md).

The service holds paid-content keys. Downloaded files can be copied; the purchase record does not prove copyright ownership. There is no independent security audit yet.

## For developers

[Install and recover](docs/INSTALL.md) · [Architecture](docs/ARCHITECTURE.md) · [Publish Skills](docs/PLATFORM.md) · [Deploy](docs/DEPLOYMENT.md) · [Validation](VALIDATION.md) · [Competition preparation](docs/HACKATHON.md) · [Founder](docs/PITCH.md)

Run an isolated local demo from a clean clone (Node.js 24+, pnpm 11):

```sh
pnpm install --frozen-lockfile
pnpm run demo
```

This local demo simulates payment. Public Devnet evidence is recorded separately. Application source and the sample are MIT licensed; each external Skill keeps its own license.
