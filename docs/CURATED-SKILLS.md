# Free curated Skills — October 10, 2026

Three text-only Skills from the official `anthropics/skills` repository are available in the live catalog. They are free curated mirrors: Anthropic, PBC. and upstream contributors remain the original authors; SkillSeal is the distributor. The operator's release signature is not an upstream author signature or endorsement.

| Skill and verified share page | License | Package files | Source |
| --- | --- | --- | --- |
| [Frontend Design — Anthropic](https://skillseal-47-236-112-184.sslip.io/skills/b635abbe85bd4013d60a644323587e5835ee67c1fa7403f9d55c6a6e5bf142e6) | Apache-2.0 | 5 | [Pinned upstream](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design) |
| [Internal Communications — Anthropic](https://skillseal-47-236-112-184.sslip.io/skills/f78e7f75c5cb4ec69eb732e895f060f2636e20ba0a0a94258baebb38994a4a7a) | Apache-2.0 | 9 | [Pinned upstream](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/internal-comms) |
| [Brand Guidelines — Anthropic](https://skillseal-47-236-112-184.sslip.io/skills/4bbeb5fd6bfcc429e0ddc0e30443dd253509f81f20e36f837912a969033f1504) | Apache-2.0 | 5 | [Pinned upstream](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/brand-guidelines) |

Each share page offers `Download Skill (.zip)`, an installation command and a copyable version URL. No wallet, payment, Devnet tokens or chain transaction is needed to publish or download these free versions. The original MIT Research Brief and the two separate Devnet checkout test versions remain available, for six active releases in total (four free and two test-paid).

## Provenance and license

The imported upstream commit is `dbd4588f9e1033efb41dad4bef2f7947c8993d44`. All original Skill files and per-Skill `LICENSE.txt` files are byte-for-byte unchanged. Packages also include the complete upstream repository-level `THIRD_PARTY_NOTICES.md`, a curator notice and `PROVENANCE.json` with original-file SHA-256 values. Fonts, software, scripts and binaries referenced by the documentation are not bundled. The new notices explain this scope.

Original license terms apply to each Skill package separately from SkillSeal's MIT application license. Preserve upstream copyright, license and relevant notices in redistribution. Trademark names identify the source and imply no endorsement. The operator wallet shown under creator approvals signs this free curated release, and is not a claim of authorship or an upstream collaborator's consent.

The first-pass review covered all instruction/reference text, file types, paths and local references. No imported code or agent instruction was executed during ingestion. Internal Communications references connected company sources; using those sources or sending messages depends on the user's own access and authorization. Brand Guidelines describes Anthropic's brand styling, not a general license to use its marks.

`doc-coauthoring` was considered but deferred because this pinned folder lacks its own explicit license file; no license was invented or copied from an unrelated Skill. No proprietary document-generation packages or unlicensed aggregator content were imported.

## Install and share

Install the [standalone CLI](INSTALL.md) first. Each command writes to a new directory and refuses to overwrite an existing installation. Load the installed `SKILL.md` in an agent that supports the needed tools; downloading a Skill does not grant external connector permissions.

```sh
skillseal install b635abbe85bd4013d60a644323587e5835ee67c1fa7403f9d55c6a6e5bf142e6 \
  --server https://skillseal-47-236-112-184.sslip.io \
  --destination ./skills/anthropic-frontend-design
```

```sh
skillseal install f78e7f75c5cb4ec69eb732e895f060f2636e20ba0a0a94258baebb38994a4a7a \
  --server https://skillseal-47-236-112-184.sslip.io \
  --destination ./skills/anthropic-internal-comms
```

```sh
skillseal install 4bbeb5fd6bfcc429e0ddc0e30443dd253509f81f20e36f837912a969033f1504 \
  --server https://skillseal-47-236-112-184.sslip.io \
  --destination ./skills/anthropic-brand-guidelines
```

## Acceptance

All three releases passed operator inspection, signed curator approval and active/free checks. Public API downloads matched the prepared packages. Actual Chrome ZIP downloads and public packaged CLI 0.2.0 installations matched every file (5, 9 and 5 files respectively), including licenses and provenance. Existing-directory overwrite attempts were rejected. These checks verify package delivery and provenance; they do not claim task-quality evaluation across every agent or a complete malicious-prompt audit.

[Machine-readable acceptance](CURATED-SKILLS.json) records the exact release/content/ZIP hashes and upstream file hashes. Existing purchase/refund/recovery evidence remains in [ONLINE-ACCEPTANCE.md](ONLINE-ACCEPTANCE.md). Adding free catalog records required no application rollout, paid cloud resources or changes to the existing hosting configuration.
