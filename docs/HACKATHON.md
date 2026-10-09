# SkillSeal — Crypto World's Fair submission preparation

SkillSeal's project registration was verified in the owner's Colosseum browser on October 9, 2026: [project page](https://colosseum.com/arena/projects/skillseal), project ID 16413, category **AI Platforms / Agents**, one registered team member. The project is created; **final submission is not complete**. The page showed seven project-detail items, four media/code items, and the founder submission profile requiring attention. No online fields were changed during this review.

## Event and deadline

The active event is [Crypto World's Fair](https://colosseum.com/worldsfair), September 14–October 12, 2026. Frontier is an earlier event. The [official rules](https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf) set the deadline at **October 12, 11:59 PM PDT**, equivalent to **October 13, 2:59 PM China Standard Time**. The working target is October 12, 8:00 PM China Standard Time to leave a submission buffer.

The current logged-in submission form requires:

- English project answers; the public brief description currently needs translation.
- A direct GitHub repository link, with public access or judge access. A profile link is not accepted.
- A project logo or graphic in JPEG, PNG, WebP, or GIF. A prepared 512px PNG is in `assets/skillseal-mark.png`.
- A live product demo video **up to 3 minutes**. It should show the product in use.
- A separate public pitch/team video **up to 2 minutes**. This current form is more specific than the general FAQ's presentation guidance.
- Complete founder submission profiles for every team member.
- Required country and Telegram contact. Country is confirmed as **China**; Telegram remains unavailable.

Selecting **Solana** in the chain field reflects the implementation and is the proposed track choice. The checkbox is currently unselected online. The accelerator application switch is currently off; no accelerator application is assumed.

## Form-ready answers

[submission-fields.json](submission-fields.json) contains English answers corresponding to the observed form. The brief description, build/audience answer, motivation, chain use, technology disclosure, contributor disclosure, judge notes, and repository context are within the observed character limits. Null entries are unresolved information, not values to paste into a form. This file is a local draft, not a submission receipt.

**One-line pitch:** SkillSeal delivers encrypted Agent Skills, permanent version licenses, and approved creator revenue splits through Solana escrow, while keeping installed workflows local.

The initial users are wallet-native Agent developers and small teams co-authoring reusable workflows. The hypothesis is that those teams value local use, wallet purchase recovery, and visible split accounting. There are no claimed paying users, customer interviews, or revenue results. The Research Brief demonstration uses explicitly fictional evidence.

## Product and evidence

The MVP contains the marketplace, wallet checkout, publisher/installer/recovery CLI, encrypted bundles, trusted key custody, persistent order state, settlement worker, and an Anchor program for author approvals, escrow, licenses, payouts, and timeout refunds. Authors approve an immutable release and split; new terms require a new version. Purchased files can be used offline. The buyer's wallet identity is separate from the X25519 delivery key.

Local simulation demonstrates delivery and recovery. The original validation record reports two compiled SBF ProgramTest tests, including atomic rollback during a failed author payout. Those tests are local chain execution, not public Devnet deployment. The latest TypeScript checks are recorded in [VALIDATION.md](../VALIDATION.md).

Public Devnet acceptance is the highest-priority remaining engineering milestone. Collect real deployment, author approvals, payment, settlement, balances, installation/reinstall, and timeout-refund evidence using [DEVNET-ACCEPTANCE.md](DEVNET-ACCEPTANCE.md). Do not replace missing evidence with an Explorer URL constructed from a placeholder.

The service is trusted to hold content keys. Encryption cannot stop copying after decryption or prove copyright ownership. The MVP has no independent security audit and no production usage evidence. Conventional payment systems can support encrypted delivery and split payments too; the Solana benefit here is wallet-native settlement and inspectable collaboration accounting.

## Work schedule — China Standard Time

| Date                 | Work and completion condition                                                                                                                                                 | Dependency                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Oct 9                | Verify registration, prepare English UI and form answers, fix pending checkout states, strengthen the example Skill, run regression checks.                                   | Local implementation and review.                                                   |
| Oct 10               | Deploy to public Devnet; complete one real test-USDC purchase, 70/30 payouts, local install and reinstall. Record transaction evidence. Prepare the direct GitHub repository. | Test SOL, program build/deploy, author/buyer funding, repository/license decision. |
| Oct 11               | Exercise interrupted checkout and timeout refund; record the live product demo and the separate founder pitch. Check uploaded video visibility.                               | Devnet acceptance, founder facts, video recording/upload.                          |
| Oct 12, before 20:00 | Finalize form answers, logo, repository/video links, Telegram contact and founder profile. Review the complete submission preview. Submit and verify the receipt.             | Owner's missing profile/contact information and final submission action.           |
| Oct 13, before 14:59 | Emergency buffer only: resolve upload/access issues and confirm the platform shows the project submitted.                                                                     | Official deadline; no new feature scope.                                           |

If Devnet funding is still blocked on Oct 10, keep developing the repeatable local flow and record the blocker accurately. A mock video is a fallback demonstration, not a substitute for chain acceptance. Do not spend the remaining time adding NFTs, mainnet payments, usage metering, or another chain.

## Remaining owner inputs

- Telegram contact: required by the form; no contact supplied yet.
- Founder profile: role/title, city, school status, educational background, relevant experience, and the required gender choice (including “Prefer not to say”). Review the prefilled full name; a handle is not necessarily the desired full name.
- Source-code license: MIT, selected under the owner's request for a permissive license. The new public repository is https://github.com/fangnster/skillseal. Purchased creator packages may have separate terms.
- Confirm the founder pitch biography and any work predating the contest before publishing the final videos and submission.

Prepared next to the code: [product demo guide](DEMO.md), [two-minute pitch script](PITCH.md), [Devnet acceptance runbook](DEVNET-ACCEPTANCE.md), [publishing guide](PUBLISHING.md). The plan does not create reminders or schedule background runs.

## Owner approval and community referral

The owner explicitly requires confirmation before **final submission**. Preparing or saving a draft, uploading authorized code and producing reviewable videos does not authorize the final submission action. The owner requested `solar` as the community referral; check the exact form option and select it before final submission. Do not substitute the Solana chain checkbox for the community referral. Telegram is still unavailable.
