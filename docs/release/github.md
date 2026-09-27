# Copper release process

Copper follows Loadout’s draft-first installer workflow. The owner approved
publishing without paid Apple or Windows certificates: macOS uses an ad-hoc
signature, Windows is unsigned, and installation notes disclose this clearly.

1. Set matching versions in the workspace packages and desktop build metadata.
2. Update the changelog and release notes. Run `pnpm check`, `pnpm build`,
   `pnpm build:web`, `pnpm audit --audit-level=moderate`, and `pnpm security:scan`.
3. Commit, push, and tag the verified commit with its version (`v0.1.0`).
4. Release CI verifies that commit, then builds on five matching native runners:
   macOS ARM64/x64, Windows x64, and Linux ARM64/x64. It rebuilds SQLite for each.
5. macOS jobs verify ad-hoc signatures and disk images. The draft job requires
   all nine installers and writes `SHA256SUMS` before uploading anything.
6. Review the draft, verify downloaded checksums and packaged startup, then
   publish it. The workflow never publishes a partial release automatically.

`workflow_dispatch` on main checks all installer builds without creating a release; on a tag it can build the release draft. Never move a
published tag. `pnpm package` remains a local build with `--publish never`.

Automatic updates are disabled for this release. A future signed release can
use the strict `pnpm release:build` and `pnpm release:publish` path, which still
requires credentials, notarization, and validated update metadata. Before
switching to that path, configure the protections and credentials in SECURITY.md
and verify a real update. Release builds currently need only GitHub’s automatic
token, not a personal publishing token.
