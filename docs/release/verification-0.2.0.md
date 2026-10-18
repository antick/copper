# Copper 0.2.0 verification

This record separates source checks from actual installer and update acceptance. Pending items
must be completed before the draft is published.

## Source and repository

- Locked dependencies restored with `pnpm install --frozen-lockfile`.
- Frontend tests passed with two workers (251 tests including the restart-error regression),
  and the final native suite passed (150 tests). Both typechecks and Biome passed.
  An unconstrained parallel run hit test timeouts under concurrent packaging load; the bounded
  rerun passed without changing assertions or timeouts.
- Production desktop/web and landing builds passed. Vite reports the existing large renderer chunks.
- Secret scanning passed for working files and reachable Git history (zero potential secrets).
- Dependency audit has two existing reviewed build-tool exceptions, `braces` and `sprintf-js`;
  this is not a zero-advisory report.
- Changed Markdown fences/local links and `git diff --check` passed.
- GitHub main requires CI/review; a maintainer bypass remains available. Release tags are restricted
  to maintainers and the `release` environment requires review and permits only version tags.
- Apple signing backup matched the installed Developer ID certificate. Apple authenticated the
  notarization key. Signing secrets are scoped to the protected release environment.

## Installed application and update acceptance

- The production release helper built a Developer ID signed, notarized Apple Silicon app and
  DMG. Gatekeeper assessment, stapled tickets, ZIP extraction, DMG mount/checksum, native SQLite,
  and final ZIP-only updater metadata checks all passed.
- Installed a signed 0.2.0 test app from its DMG and updated it to a signed 0.2.1 test build.
  Verified offline-check failure and retry, download, cancelled restart, explicit install, and
  successful macOS relaunch reporting 0.2.1.
- Repeated the update using the normal profile location after backing it up. The edited Markdown
  note, recent Vault, saved tab, and Dark appearance survived. Startup returns to Welcome;
  selecting the recent Vault restores its tab. Original app preferences were restored afterward.
- Copper and Copper Dev ran together; Dev used its independent empty profile and app menu.
- The final `pnpm dev` launcher started despite an inherited Node-mode environment; the native
  window and app menu both show Copper Dev.
- The acceptance run exposed delayed native installation errors being ignored. The final source
  now forwards them to the retry UI, with native and renderer regression tests.

Pending: final CI-built public artifact verification and public downloads.

Test builds use a local-only generic update feed and isolated `COPPER_USER_DATA_DIR`. They must
never be published or left installed as the everyday app. Public artifacts use GitHub Releases.

## Website

The production-output preview renders the updated signing/update guidance at 390px without
horizontal overflow. The download and installation links point to the public Copper repository.
Live production deployment verification remains pending publication.

## Hardware boundary

This machine can validate Apple Silicon launch and update behavior. Intel macOS artifacts can be
checked by the Intel CI runner; physical Intel-Mac UI acceptance remains separate. Windows/Linux
native packaging and SQLite checks do not replace interactive acceptance on those systems.
