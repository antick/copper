# macOS release

- Product: Copper
- Bundle identifier: `app.copper.desktop`
- Packaging configuration: `package.json`, `build`

Use `pnpm install --frozen-lockfile` and `pnpm build` for local test artifacts under `release/`. Those files are not approved public distributables.

Public builds require a Developer ID Application certificate, hardened runtime, and notarization. Configure the protected environment described in [SECURITY.md](../../SECURITY.md), then follow the [release workflow](github.md). The release script verifies the final app using `codesign`, Gatekeeper, and the stapled notarization ticket, and verifies artifact checksums against update metadata before upload.

Do not distribute ad-hoc signed builds or instruct users to disable Gatekeeper/quarantine. A real signed automatic update must be verified before the first public release. If signing or protection prerequisites are absent, keep public publication blocked.
