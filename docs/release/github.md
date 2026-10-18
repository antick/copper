# Copper release process

The desktop version in `apps/desktop/package.json` determines the tag and artifacts. Keep the root
package version and desktop `buildVersion` synchronized. Public macOS releases support Apple Silicon only and are signed and
notarized; Windows and Linux use manual installer updates.

## One-time setup

Configure GitHub's `release` environment with a required maintainer reviewer and a deployment
policy allowing only `v*.*.*` tags. A sole maintainer may review their own deployment. Restrict
release-tag creation, updates, and deletion to maintainers through an active tag ruleset. Protect
main with CI and reviewed changes. Signing secrets must never be available to pull-request jobs.

| Setting | Kind | Purpose |
| --- | --- | --- |
| `APPLE_TEAM_ID` | Environment variable | Apple Developer team |
| `MACOS_CERTIFICATE_P12` | Environment secret | Base64 Developer ID Application certificate/private key |
| `MACOS_CERTIFICATE_PASSWORD` | Environment secret | Password protecting the certificate export |
| `APPLE_API_KEY_P8` | Environment secret | Apple notarization private key contents |
| `APPLE_API_KEY_ID` | Environment secret | Apple API key ID |
| `APPLE_API_ISSUER` | Environment secret | Apple API issuer ID |

Keep an encrypted backup outside GitHub. GitHub cannot export secret values. The workflow uses a
temporary signing keychain and removes it and the API key after packaging, including failed jobs.
No signing or GitHub credentials are included in the app.

## Ship a version

1. Update versions, `CHANGELOG.md`, and `docs/release/<version>.md`. Synchronize `TODO.md` with
   actual verification. Do not claim platform acceptance based only on a passing build.
2. Run `pnpm check`, `pnpm build:web`, `pnpm build`, `pnpm audit --audit-level=moderate`,
   `pnpm security:scan`, and `git diff --check`. Review any configured audit exceptions.
3. Commit and push the verified change to main. Create and push the matching `v<version>` tag.
   Never move an existing release tag; fix a failed release with a new version.
4. Approve the protected release environment. All four native builds must finish. macOS jobs sign,
   notarize, verify native SQLite and bundle identity, and validate Apple's approval. The final
   job assembles all seven installers, update files, and checksums into a GitHub draft.
5. Download the candidate installers. Verify Apple Silicon macOS artifacts, launch on the
   available hardware, and test a signed-version-to-signed-version update on a controlled feed.
   Confirm the installed app and Copper Dev coexist and saved data survives an update. Keep
   Windows/Linux interactive gaps explicit when hardware is unavailable.
6. Publish the verified draft using the maintainer CLI (`pnpm release:publish` with the matching
   `GITHUB_REF_NAME`). The script revalidates downloaded assets before publication. A maintainer
   GitHub credential is needed for this action; never ship it inside the application.
7. Confirm public downloads, update metadata, signatures, checksums, and the production website.
   Publication using a maintainer credential triggers Vercel production. GitHub's automatic
   `GITHUB_TOKEN` does not trigger a second release-event workflow: if used, manually dispatch
   `vercel-production.yml` after publication and verify the deployed page.

`workflow_dispatch` can rebuild a candidate from an existing matching version tag without publishing. Ordinary `pnpm build` and
`pnpm package` never publish. Local packaging is not proof of a verified public release.

## Update and recovery policy

The first signed installation replaces 0.1.0 manually. Later signed macOS apps use GitHub's public
update feed without a token. Dev, web preview, Windows, and Linux do not perform automatic installs.

Do not overwrite published installers or move tags. If a release fails before publication, keep it
a draft. If a published update has a problem, stop advertising it while preparing a higher-version
fix; automatic downgrades are disabled. Preserve user data and back up Vaults before migrations.
