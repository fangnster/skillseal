# SkillSeal security scope

This is a Devnet MVP with a trusted content-key service. It has not received an independent contract or infrastructure audit. The project excludes mainnet funds.

## Sensitive material

Keep `.env.local`, `.data`, issuer and deployment keypairs, key-vault backups, and browser/CLI session files private. A session contains an X25519 decryption private key. Do not place secrets in issue reports, screenshots, commit history or logs.

The master key, database and ciphertext backups must be recoverable. Chain records cannot reconstruct lost content keys. An existing key vault must not be “reset” by generating a new master key.

## Trust assumptions

The authorization service holds content keys and must deliver the correct key and package. The Anchor program validates settlement and author revenue shares; it cannot validate Skill quality, originality or legal ownership. Buyers can copy plaintext after installation. The timeout refund applies only to an unsettled order and cannot revoke already decrypted content.

Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [VALIDATION.md](VALIDATION.md) for the implemented protections and unfinished acceptance checks.

## Reporting an issue

No public repository or security-reporting endpoint has been configured yet. Contact the project owner privately with a minimal reproduction; never publish private keys or reusable exploit material in a public issue. Once the repository exists, its owner should enable private vulnerability reporting and update this file with the actual reporting route.

Include the affected version, payment backend, environment and reproduction steps, with all secrets removed. Do not test against other users' wallets or third-party production services.
