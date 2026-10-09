# Working on SkillSeal

Use Node.js 24+ and pnpm 11. Install with `pnpm install --frozen-lockfile`; use `pnpm run demo` for an isolated local flow. The [Chinese runbook](docs/README.zh-CN.md) describes the API, CLI and Devnet setup.

## Checks

```sh
pnpm run format:check
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run demo
```

For contract changes, also build the compiled SBF program and run its integration tests:

```sh
cd anchor
cargo fmt --all -- --check
cargo check --locked --lib
cargo build-sbf --tools-version v1.53 --manifest-path programs/skill-vault/Cargo.toml
SBF_OUT_DIR="$PWD/target/deploy" cargo test --locked --test escrow
```

Known validated tooling is listed in `VALIDATION.md`. The SBF build needs a Rust 2024-capable platform toolchain; the older platform-tools 1.48 cannot compile the locked dependencies. GitHub CI runs the JS checks and host Rust checks; compiled SBF tests run separately through the commands above.

## Design invariants

Keep version metadata immutable, require all authors' approvals, and preserve fixed-price settlement and the atomic grant/payout. Key release must depend on finalized chain state, not database status alone. Keep wallet identity separate from the X25519 delivery key, and use origin-bound one-time challenges for recovery.

Installation must never execute a package or overwrite an existing destination. Preserve traversal, symlink, canonical-path and file/directory collision checks. Mock payments stay explicitly labelled, loopback-only and unavailable in production.

When changing a wire format, signing message, authenticated-data string or Anchor account layout, document compatibility and migration. The retained `skill-vault` v1 namespace is intentional.

## Changes and evidence

Describe the concrete behavior and relevant validation in each pull request. Include focused tests for payment, key delivery, recovery and path-safety changes. Update the validation record only after running the corresponding checks. Do not infer public-chain success from local simulation or ProgramTest results.

Source-code licensing is pending before the public release. Do not change that choice or introduce content with uncertain redistribution terms through a routine implementation change.
