# SkillSeal — Crypto World's Fair submission preparation

SkillSeal's registration is verified: [project page](https://colosseum.com/arena/projects/skillseal), project ID 16413, category **AI Platforms / Agents**, one registered team member. On October 9, 2026, the English project answers, China, Solana, public repository link and logo were saved as a draft. **Final submission is not complete and requires explicit owner confirmation.**

[The public MIT repository](https://github.com/fangnster/skillseal) contains the complete MVP. Its first full-source CI passed. The [public website](https://fangnster.github.io/skillseal/) and standalone installer are live. The [132.50-second product walkthrough](https://youtu.be/MaYbKNupnBA) shows the actual live website with English upload controls, public Devnet test purchase and exact 70/30 payouts, plus session recovery using a local API/CLI. Hosted checkout remains disabled. The [1:39 founder introduction](https://youtu.be/R40MxhZ26mo) uses the approved Senior Technical Expert title. Both videos are Unlisted and viewable by link. Founder photographs, resume and private video production assets stay outside the public code repository.

The founder submission profile is confirmed complete. A required Telegram contact remains unresolved; the owner has no account. The owner requested **solar** as the community referral; that option is not present in the observed project-details, media/code or review sections and must be verified before final submission. It is distinct from the selected Solana chain checkbox.

## Event and deadline

The active event is [Crypto World's Fair](https://colosseum.com/worldsfair), September 14–October 12, 2026. Frontier is an earlier event. The [official rules](https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf) set the deadline at **October 12, 11:59 PM PDT**, equivalent to **October 13, 2:59 PM China Standard Time**. The working target is October 12, 8:00 PM China Standard Time to leave a submission buffer.

The current logged-in submission form requires:

- English project answers; the saved public brief description is now English.
- A direct GitHub repository link, with public access or judge access. A profile link is not accepted.
- A project logo or graphic in JPEG, PNG, WebP, or GIF. A prepared 512px PNG is in `assets/skillseal-mark.png`.
- A live product demo video **up to 3 minutes**. It should show the product in use.
- A separate public pitch/team video **up to 2 minutes**. This current form is more specific than the general FAQ's presentation guidance.
- Complete founder submission profiles for every team member.
- Required country and Telegram contact. Country is confirmed as **China**; Telegram remains unavailable.

Selecting **Solana** in the chain field reflects the implementation and is the proposed track choice. The checkbox is now selected and saved online. The accelerator application switch is currently off; no accelerator application is assumed.

## Form-ready answers

[submission-fields.json](submission-fields.json) contains English answers corresponding to the observed form. The brief description, build/audience answer, motivation, chain use, technology disclosure, contributor disclosure, judge notes, and repository context are within the observed character limits. Null entries are unresolved information, not values to paste into a form. The prepared project and repository fields have been saved to the online draft; this file is not a final submission receipt.

**One-line pitch:** SkillSeal delivers encrypted Agent Skills, permanent version licenses, and approved creator revenue splits through Solana escrow, while keeping installed workflows local.

The initial users are wallet-native Agent developers and small teams co-authoring reusable workflows. The hypothesis is that those teams value local use, wallet purchase recovery, and visible split accounting. There are no claimed paying users, customer interviews, or revenue results. The Research Brief demonstration uses explicitly fictional evidence.

## Product and evidence

The MVP contains the marketplace, wallet checkout, publisher/installer/recovery CLI, encrypted bundles, trusted key custody, persistent order state, settlement worker, and an Anchor program for author approvals, escrow, licenses, payouts, and timeout refunds. Authors approve an immutable release and split; new terms require a new version. Purchased files can be used offline. The buyer's wallet identity is separate from the X25519 delivery key.

Local simulation demonstrates delivery and recovery. The original validation record reports two compiled SBF ProgramTest tests, including atomic rollback during a failed author payout. Those tests are local chain execution, not public Devnet deployment. The latest TypeScript checks are recorded in [VALIDATION.md](../VALIDATION.md).

Public Devnet deployment, signed author approvals, a 1 test-USDC purchase, exact 70/30 payouts and CLI installation/recovery passed on October 9. All signatures, balances and transport failures are in [DEVNET-ACCEPTANCE.md](DEVNET-ACCEPTANCE.md). Browser-wallet purchase, interrupted-payment recovery and public Devnet timeout-refund acceptance remain outstanding. Hosted paid checkout remains disabled.

The service is trusted to hold content keys. Encryption cannot stop copying after decryption or prove copyright ownership. The MVP has no independent security audit and no production usage evidence. Conventional payment systems can support encrypted delivery and split payments too; the Solana benefit here is wallet-native settlement and inspectable collaboration accounting.

## Work schedule — China Standard Time

| Date                 | Work and completion condition                                                                                                                                                                              | Dependency                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Oct 9                | Registration verified; public source, website and standalone installer published; HTTPS installation checked; English product and founder videos published.                                                | Local implementation and review.                                             |
| Oct 10               | Positive Devnet CLI path completed October 9: deploy, purchase, 70/30 payouts and recovery/reinstall. Continue browser-wallet and interrupted-payment acceptance.                                          | Funded Devnet test accounts and deployed program are available.              |
| Oct 11               | Exercise interrupted checkout and timeout refund; review the prepared videos and update chain footage after Devnet acceptance. Publish reviewed videos and check visibility.                               | Devnet acceptance, founder facts, video recording/upload.                    |
| Oct 12, before 20:00 | Finalize form answers, logo, repository/video links, Telegram contact and founder profile. Review the complete submission preview. Obtain explicit owner confirmation, then submit and verify the receipt. | Owner's missing profile/contact information and explicit final confirmation. |
| Oct 13, before 14:59 | Emergency buffer only: resolve upload/access issues and confirm the platform shows the project submitted.                                                                                                  | Official deadline; no new feature scope.                                     |

If Devnet funding is still blocked on Oct 10, keep developing the repeatable local flow and record the blocker accurately. A mock video is a fallback demonstration, not a substitute for chain acceptance. Do not spend the remaining time adding NFTs, mainnet payments, usage metering, or another chain.

## Remaining owner inputs

- Telegram contact: required by the form; no contact supplied yet.
- Founder profile: role/title, city, school status, educational background, relevant experience, and the required gender choice (including “Prefer not to say”). Review the prefilled full name; a handle is not necessarily the desired full name.
- Review the published founder biography and disclose any work predating the contest before final submission.

Prepared next to the code: [product demo guide](DEMO.md), [two-minute pitch script](PITCH.md), [Devnet acceptance runbook](DEVNET-ACCEPTANCE.md), [publishing guide](PUBLISHING.md). The plan does not create reminders or schedule background runs.

## Owner approval and community referral

The owner explicitly requires confirmation before **final submission**. Preparing or saving a draft, uploading authorized code and producing reviewable videos does not authorize the final submission action. The owner requested `solar` as the community referral; check the exact form option and select it before final submission. Do not substitute the Solana chain checkbox for the community referral. Telegram is still unavailable.
