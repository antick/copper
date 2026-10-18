# Security

Please report vulnerabilities through [GitHub's private vulnerability reporting](https://github.com/antick/copper/security/advisories/new). Do not post exploit details, credentials, or private vault contents in a public issue. macOS releases starting with 0.2.0 are Developer ID signed and Apple-notarized; Windows installers remain unsigned; see [installation notes](docs/INSTALL.md).

Copper treats vault contents as untrusted. Git remains off until you enable it through a native trust prompt; Git configuration can execute programs, so only enable it for a repository you trust. Trust expires when you close the vault or quit. Remote note images do not load until you choose to load them; doing so reveals your network address to that server.

Run `pnpm check`, `pnpm audit --audit-level=moderate`, and `pnpm security:scan` before release. The scanner downloads a pinned, checksum-verified Gitleaks binary and scans both the current project files and reachable Git history. Reports print locations and rule IDs, never matched values. Do not add blanket exclusions to silence a real leak.

## Release policy

Public macOS releases require Developer ID signing, hardened runtime, Apple notarization,
validated update metadata, and a real signed update acceptance test. Windows and Linux use
manual installer updates. Ordinary builds and pull requests never publish.

The protected `release` environment contains the Apple signing secrets and permits only version
tags. Release-tag rules restrict creation and prevent unreviewed changes. Only the protected draft
job receives repository write access; signing keys are removed from runners after use. See
[the release process](docs/release/github.md) for exact secret names and verification steps.

Never commit private keys, certificate exports, or passwords. Keep a protected backup outside
GitHub. Update users never need a GitHub token. Copper Dev has independent app data and cannot
install public updates, but it can still edit any Vault folder you explicitly open.

Keep published tags and artifacts immutable. Verify replacement releases with a higher version;
do not force a downgrade across a data migration. Preserve Vault backups during acceptance tests.
