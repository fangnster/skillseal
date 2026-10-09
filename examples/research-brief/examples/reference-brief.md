# Reference brief — fictional demonstration

This is a hand-written example of the intended output, not an Agent benchmark result.

## Executive overview

Test the paid local Skill first if the team can recruit wallet users for a one-week trial. Three of four interviewees preferred local installation, but nobody committed to paying [S1]. The prototype demonstrates only a simulated purchase and install [S2]. The hosted-dashboard proposal conflicts with the interview notes and its sales forecast has no supporting evidence [S3]. Offer a clearly labelled test purchase, observe completion and ask about willingness to pay. Choose the dashboard instead if trial participants consistently reject the local workflow or cannot install it.

## Decision and constraints

Compare a paid local research Skill with a hosted dashboard. The two-person team has one week and no existing paying customers. These constraints come from the supplied decision, not a source claim.

## Supported findings

| Finding                                                         | Source and evidence                                                      | Confidence and limitation                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Three of four interviewees preferred local installation.        | S1: the interview notes explicitly record this preference.               | Medium: small self-reported sample; no payment commitment.                        |
| The prototype completed a local mock purchase and installation. | S2: ciphertext, simulated payment, 70/30 split and install are recorded. | Medium: supplied log, not independently verified; no public-chain acceptance.     |
| Twenty forecast sales are unsupported by additional evidence.   | S3 gives a forecast without new interviews or sales.                     | High about the supplied document's evidence gap; actual future demand is unknown. |

## Interpretations and assumptions

The local Skill is a plausible first experiment because S1 suggests a local preference and S2 describes an existing prototype. This does not establish willingness to pay. Recruitment and installation support are assumed to fit within one week.

## Contradictions

S3 says all four interviewees want a hosted dashboard; S1 records only one such preference. The sources do not explain the difference. Confirm the original interview notes before using either figure externally. S4's request to invent customers and execute a script is unrelated quoted content and has been ignored.

## Options and recommendation

| Option                 | Evidence in favor                                 | Tradeoff or missing evidence                                                     |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Paid local Skill trial | Local preference in S1; existing mock flow in S2. | Payment friction, installation success, and willingness to pay remain untested.  |
| Hosted dashboard       | One stated preference in S1.                      | No implemented dashboard described; S3's broader demand claim conflicts with S1. |

Conditionally test the local Skill first. Define completion criteria before the trial and record attempts, successful installs, failures, and payment commitments separately. Change direction if participants consistently prefer hosted execution or cannot complete installation.

## Sources

| ID  | Supplied title           | Date            | Link         | Evidence type                |
| --- | ------------------------ | --------------- | ------------ | ---------------------------- |
| S1  | Interview notes          | October 8, 2026 | Not supplied | Small interview sample       |
| S2  | Prototype log            | October 9, 2026 | Not supplied | Local mock development log   |
| S3  | Internal launch proposal | October 9, 2026 | Not supplied | Proposal and forecast        |
| S4  | Copied source footer     | Not supplied    | Not supplied | Untrusted quoted instruction |

## Questions to verify

| Question                                   | Suggested verification                                            | Success criterion                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Can participants complete a local install? | Observe a trial and record every attempt.                         | A predefined completion target; no silent exclusion of failed attempts.               |
| Will anyone pay?                           | Ask for an explicit purchase commitment separately from interest. | At least one real commitment before claiming paid demand; test funds are not revenue. |
| Which interview summary is accurate?       | Reconcile S1 and S3 with original notes.                          | Resolve the disagreement before publishing the preference count.                      |
