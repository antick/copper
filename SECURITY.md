# Security

Please report vulnerabilities through [GitHub's private vulnerability reporting](https://github.com/antick/copper/security/advisories/new). Do not post exploit details, credentials, or private vault contents in a public issue. No installer release is currently security-cleared.

Copper treats vault contents as untrusted. Git remains off until you enable it through a native trust prompt; Git configuration can execute programs, so only enable it for a repository you trust. Trust expires when you close the vault or quit. Remote note images do not load until you choose to load them; doing so reveals your network address to that server.

Run `pnpm check`, `pnpm audit --audit-level=moderate`, and `pnpm security:scan` before release. The scanner downloads a pinned, checksum-verified Gitleaks binary and scans both the current project files and reachable Git history. Reports print locations and rule IDs, never matched values. Do not add blanket exclusions to silence a real leak.

## Public release prerequisites

- Configure the source repository's `release` environment with required reviewers and a deployment policy limited to `v*.*.*` tags. Add an active tag ruleset that restricts creation, updates, and deletion of release tags. Protect the main branch with reviewed pull requests and required CI checks.
- Enable private vulnerability reporting, secret scanning/push protection, and dependency alerts where the GitHub plan supports them. Recheck these settings when changing visibility.
- Store `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` as release-environment secrets. The certificate must be a Developer ID Application certificate. Never commit certificate exports or passwords.
- Publish to this repository using the automatic `GITHUB_TOKEN`. Only the protected publishing job receives `contents: write`; no personal upload token is needed.
- Use a tag matching `package.json`'s version. Release CI verifies that exact commit, requires signing/notarization, checks the app identity and update checksums, then uploads artifacts as a draft before publishing. Ordinary `pnpm build` never publishes.
- Verify a real signed automatic update on macOS before the first public distribution. Review screenshots, history, and documentation for private data. A clean pattern scan is not proof of complete security.

Publishing the source does not approve an installer for distribution. Signing credentials and a successful signed update acceptance test remain release prerequisites.
