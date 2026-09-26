# Copper release process

Future verified installers will be published in [Copper releases](https://github.com/antick/copper/releases). This new source repository does not yet have an approved installer. Once available, download a verified release and drag Copper into Applications; no GitHub token is needed. Do not bypass macOS security checks.

Before public distribution, complete the signing, GitHub protection, disclosure, and update checks in [SECURITY.md](../../SECURITY.md). Source visibility and release publication are separate decisions.

## Maintainer workflow

1. Configure the protected `release` environment, release-tag protection, and signing credentials described in the security guide.
2. Run `pnpm check`, `pnpm build:web`, `pnpm audit --audit-level=moderate`, and `pnpm security:scan`.
3. When ready to publish, create a tag matching the version in `apps/desktop/package.json`, such as `vX.Y.Z`. Pushing that tag is a deliberate publication action.
4. The release workflow reuses CI for that exact commit. After approval, it validates remote protection settings, builds and signs Copper, notarizes the application, and verifies its signature, bundle identity, installer integrity, and update hashes.
5. Only verified artifacts are uploaded. A draft release is created before it becomes public, so a failed upload does not advertise a partial update.

`pnpm package` creates a local test package and always uses `--publish never`. It does not authorize or perform publication. `pnpm release:build` requires signing/notarization credentials and a matching release-tag environment; it fails if these are missing.

The app uses `electron-updater` and macOS code signing. The historical Tauri signing secret is not used; review and retire obsolete credentials through the owner's normal credential-management process.
