# Hosted Devnet acceptance — October 10, 2026

Hosted Solana Devnet checkout is enabled on the existing Alibaba server. Public HTTPS CLI purchase, exact 70/30 payouts, five-file installation, browser session recovery, a real 600-second timeout refund and encrypted off-host paid-vault restoration passed. Phantom browser purchase and exact ZIP recovery also passed. Test funds only; no mainnet payments or revenue claims.

[Live platform](https://skillseal-47-236-112-184.sslip.io/) · [Product walkthrough](https://youtu.be/aptKyuK1mVI) (149.00 seconds, Unlisted) · [Machine-readable evidence](ONLINE-EVIDENCE.json) · [Release checklist](RELEASE-CHECKLIST.md).

## Deployment and creator review

The service retains its existing issuer `BaCmykXfMB3KTN4d31EttQGpq9WcTURc8D3Q93ZJBvXg`, persistent SQLite/key vault and shared HTTPS proxy. Curated creator onboarding, both author approvals and operator inspection remain required. The free MIT Research Brief remains available without a buyer wallet. Two reviewed test versions cost one **test** USDC each and disclose that the same MIT files can be installed free. Engineering test accounts are not team members, customers or revenue.

Accepted application source: `f5ebb4cc1f70b6b80d544e6d50dbe1441fbaff89`. Runtime SHA-256: `d69409b4b133f20eba4f006afc3eb0dfacbf84bf6ae4c88407c6d2235fff22bc`. [Source CI](https://github.com/fangnster/skillseal/actions/runs/37967126708) passed 39 TypeScript tests, type/format checks, production build, clean packaged installation, constrained container checks and Rust/SBF compilation. Two local ProgramTest SBF integration tests previously passed for the unchanged contract; see VALIDATION.md. Public documentation commits can be newer than this deployed application source.

The first image rebuild timed out while exporting on the 1 GiB host and the host stopped responding. After owner identity verification, service recovery used the existing Node image and a read-only bind mount of the authenticated Linux runtime, avoiding another image export. No dependency installation or Next compilation occurs on the host. Key fingerprints, readiness, worker state and the original website were rechecked after recovery. A rebuild failure is recorded, not counted as a successful deployment.

## Public HTTPS purchase and recovery

- Immutable purchase version: `1e94474e54e43e9b19907a8be3d7997cc794fb6db0473e01ce05c0774552c330`; both dedicated authors approved 70/30 shares on Devnet.
- Original HTTPS order: `bb4b041a-be12-4c40-8a7d-f77100e823e6`. The finalized wallet/version account is `granted`; the independently read program owner and account fields match the release and buyer.
- [Payment](https://explorer.solana.com/tx/3JGuHXhY2ASSY7MkcqAgE5eENiPbLxCSKeVgrtwc5b1WHee5Bmtpn2tbLVZHX7QSLqcFmL6p5VhY7BTytKapXzyQ?cluster=devnet) and [settlement](https://explorer.solana.com/tx/46Yg9r6HsururDvHij5Da4FYcVGegoXq9V8C2kwPSFHmiqGiQcJzmnKM7B4YgSRu8wLG3QXm4RFnq8EEbkkjPtAh?cluster=devnet) finalized. The authors received exactly **0.7 / 0.3 test USDC** for this one-test-USDC purchase. These transactions cost 10,000 lamports in fees; account deposits are additional.
- All five installed files matched the original source bytes. A fresh delivery session and directory reused the same grant, with no second payment or payout. The independently installed public CLI **0.2.0** repeated this recovery through the actual HTTPS API.
- The actual browser `/library` page restored the private CLI delivery session, decrypted locally and downloaded a ZIP. All five ZIP files matched source. The recovery private key stays on the buyer's machine and is absent from public evidence.
- Phantom browser purchase and exact ZIP recovery also passed.

## Real timeout refund

A separate reviewed version `74bbd259736e6368c176f5b2e7162e08c83ab7caf3bbc4700960dc1914c11846` used order `7e4e2c15-9a66-48bf-9b62-50a8cbaa3558`. Only the settlement worker was paused for this controlled engineering test, with an automatic resume timer. The observed on-chain deadline was exactly 600 seconds after payment.

Early refund returned HTTP 409. After the actual deadline, synchronization preserved unfulfilled escrow, and the original buyer signed a [finalized refund](https://explorer.solana.com/tx/5dZ4FVeDLHUWJ6BA9nQEVRnjeh7FkhPBPZrB4Nhx95JLYfGhDfMufh2PNQAzRKmiqaa6m8RmLK1WZVUmSJUJn12S?cluster=devnet). Buyer balance rose from 17 to 18 test USDC, escrow fell from 1 to 0, and authors received no payout for this order. Refunded chain status is 3; key claim returned HTTP 402, and duplicate refund returned HTTP 409. The worker was restored after the test. A new checkout can legitimately repurchase a refunded version; the refunded order itself cannot claim content.

## Encrypted off-host restoration

A consistent archive of the paid vault was encrypted using AES-256-GCM, with its random encryption key wrapped under the owner's separate RSA-OAEP-SHA256 recovery public key. The private recovery key stays off host. Console transfer used bounded chunks; whole-file byte length and SHA-256 were verified before authenticated decryption.

An isolated server restore had no network access. An independent local restore checked SQLite integrity, the original issuer, all **3** encrypted release keys/content hashes and **6** orders. A saved paid delivery session opened its restored envelope and matched the restored content key and plaintext hash. The refunded order remained refunded without an envelope. This checks recovery of paid access, beyond simply listing backup files. No archive, private key, session or personal media asset is in the public repository.

## Observed failures and remaining scope

A TLS failure occurred before the refund test created an order. An early local refund attempt was blocked before any transaction because 32 seconds remained. An initial console transfer was truncated by the output limit; authentication detected corruption, and bounded chunks plus whole-file SHA verified the replacement. Phantom initially reported an unexpected connection error, then a network error during the failed host update; chain checks showed the owner's funds intact and no purchase account at that time. A later Phantom simulation reported Blockhash not found before broadcast, with two test USDC still intact. The wallet was switched explicitly to Devnet; transaction blockhashes now refresh before the signing prompt and are checked after human signing, with a clear same-order retry on expiry. Wallet-returned message contents are checked before broadcast. Five regression tests cover expiry, mutation and Phantom priority-fee compatibility. The Devnet signer specifies a zero priority fee before review because Phantom otherwise adds fee instructions while signing; the signed message must still match exactly. Cost-history RPC scans now run in the worker so optional metrics do not delay finalized-grant delivery; a regression test covers unavailable history.

A separate engineering client exited after finalized payment with chain state funded (1), then the independently installed public CLI resumed the same private session to granted (2). All five files matched, and exactly one payment plus one settlement finalized. This verifies the actual installer interruption path; it is separate from the owner Phantom run. Mainnet collection, an independent security audit, autonomous-agent spending controls and paying demand are outside the accepted Devnet scope. The service holds content keys and cannot prevent copying after decryption or prove IP ownership.

Competition content remains a draft. Final submission requires owner confirmation; verify/select `solar` as community referral and resolve the required Telegram field without inventing an account.
