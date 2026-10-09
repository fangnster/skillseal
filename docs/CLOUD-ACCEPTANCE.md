# Alibaba Cloud free catalog acceptance

> Current October 10 acceptance: Hosted Solana Devnet checkout is enabled on the existing Alibaba server. Public HTTPS CLI purchase, exact 70/30 payouts, five-file installation, browser session recovery, a real 600-second timeout refund and encrypted off-host paid-vault restoration passed. Phantom browser purchase and exact ZIP recovery also passed. Test funds only; no mainnet payments or revenue claims. See [hosted evidence](ONLINE-ACCEPTANCE.md).

The records below describe their stated observation times. Later hosted results above supersede earlier pending/disabled statuses.

Accepted October 9, 2026 at 21:51 Shanghai. [Open the live platform](https://skillseal-47-236-112-184.sslip.io/) · [Publish a Skill](https://skillseal-47-236-112-184.sslip.io/creators) · [Install the CLI](https://skillseal-47-236-112-184.sslip.io/install).

The selected existing 1 GiB Alibaba server hosts the full Next.js application and persistent SQLite vault behind its existing Caddy proxy. No new paid resource was created. GitHub Pages remains the static introduction and installer distribution.

Deployed source: `c3ffe58cfd8021a0216ee487263c388a76351cab`. The Linux x64 runtime archive's SHA-256 is `7cd049af4d9507a63413330aac8113d3df4a09a54037626093dcb17bef558721`; it was checked before extraction. The server builds from bundled production dependencies without package installation or Next.js compilation. [Source CI](https://github.com/fangnster/skillseal/actions/runs/37931044319) passed.

[Watch the live cloud walkthrough](https://youtu.be/YWXcdWWev34) (under three minutes; generic synthetic narration, actual pages and verified CLI results).

## English upload controls — October 9, 22:57 Shanghai

Deployed source `2d61be3d3ef248a269ca5a85aa4f184ea48fa3b4`, runtime SHA-256 `ef9c490f10d719e87ecca6deedf474f9f82313aff43e959e82c86a5d744b83bb`. [CI passed](https://github.com/fangnster/skillseal/actions/runs/37946646383). File selection now uses English buttons and selection messages in Creator Studio, reviewer identity restore and purchase recovery. The operating system's file chooser retains the user's system language.

The live Creator Studio passed keyboard selection and local validation of the original SKILL.md. Public CLI installation again matched all five approved sample files and refused an existing destination. The API returned `ready`, `disabled`, `devnet`. The deployment command completed with exit code zero and checked the original application as HTTP 200 before and after the update. A separate app restart at 23:09 also passed: approved release, key fingerprints, issuer and 0600 permissions persisted; original HTTPS remained 200. SkillSeal used 185.6 MiB within its 384 MiB cap, and the host had 295 MiB available.

## Observed acceptance

| Check                      | Result                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public HTTPS `/api/health` | `ready`, backend `disabled`, network `devnet`                                                                                                             |
| Signed publishing          | Encrypted MIT Research Brief 1.0.0 accepted with a signed manifest                                                                                        |
| Author approval            | Exact version and 100% author share approved                                                                                                              |
| Operator inspection        | Single-use signed inspection preview matched the original package bytes; separate listing approval succeeded                                              |
| Public share page          | Exact release, license, author share and install command displayed                                                                                        |
| Browser ZIP                | All five downloaded files matched the source bytes                                                                                                        |
| Standalone CLI 0.2.0       | Installed from the public HTTPS API into a fresh directory without a buyer wallet or payment; all five files matched; an existing destination was refused |
| App restart                | Approved release remained available; master and issuer keys unchanged; key and database files remained mode 0600; HTTPS installation still succeeded      |
| Original application       | HTTP 200 before and after deployment and the SkillSeal app restart                                                                                        |
| Resource limits            | SkillSeal capped at 384 MiB, one CPU and 128 PIDs; observed 168–199 MiB after startup, with 305–313 MiB host memory available                             |
| Network                    | Separate application networks with distinct subnets; only the existing proxy joins both                                                                   |

[Try the approved Research Brief version](https://skillseal-47-236-112-184.sslip.io/skills/778fda57fca27de5da92df1d4a13a5f300a02494992a2714e8b60a2530a5ae9e). Its signed plaintext SHA-256 is `a617bf3a049873a51a38d6620d98efa6a51afc8adeb4179108dbb85bc5e782a7`.

```sh
skillseal install 778fda57fca27de5da92df1d4a13a5f300a02494992a2714e8b60a2530a5ae9e \
  --server https://skillseal-47-236-112-184.sslip.io \
  --destination ./skills/research-brief
```

## Scope still outstanding

Public paid checkout is disabled. This acceptance creates no paid orders, simulated payments, mainnet transactions or revenue claims. Public Solana Devnet contract funding, wallet purchase, finalized settlement, paid recovery and refund must pass [Devnet acceptance](DEVNET-ACCEPTANCE.md) separately. Off-host encrypted backup and restoration have not yet been accepted. The key service remains trusted, and unlocked files can be copied.

Competition materials remain a draft. The owner must confirm before final submission; the requested `solar` referral must be verified before that step.
