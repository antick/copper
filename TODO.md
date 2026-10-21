# Copper TODO

Track outstanding work and verification here. Completed implementation history lives in Git.

## Public repository and releases

The current release is [Copper 0.2.2](https://github.com/antick/copper/releases/tag/v0.2.2),
with Developer ID signed, Apple-notarized Apple Silicon macOS installers and verified in-app
updates. Intel Macs are not supported; Windows/Linux keep manual installer updates.
Copper Dev has independent identity and app data; explicitly shared Vault folders are still shared.

- [x] Configure main protection, restricted release tags, and a reviewed tag-only `release` environment.
- [x] Install verified existing Apple signing and notarization credentials as environment-scoped secrets.
- [x] Implement isolated Copper Dev identity, icon, profile, and disabled automatic updates.
- [x] Implement update progress, explicit restart, save-before-restart, and retry behavior.
- [x] Finish local verification and all four native CI release builds.
- [x] Verify a real signed/notarized installer and signed-version-to-signed-version update on macOS.
- [x] Publish 0.2.2 and verify public downloads, updater metadata, live website, and the installed 0.2.0 → 0.2.2 update.
- [ ] Complete Windows/Linux interactive acceptance; native packaging checks are not a complete UI test.
- [ ] Retire the legacy release repository separately; its private backup exists, but deletion was previously blocked by token permissions. Legacy clients need a manual installation from this repository.

Release checks currently retain two reviewed build-tool audit exceptions (`braces` and `sprintf-js`)
in `pnpm-workspace.yaml`; a successful audit with those exceptions is not a zero-advisory result.
Do not mark release work complete on source tests alone. Keep published tags and artifacts immutable.
Local, CI, public-release, and installed-app verification are recorded in
[the 0.2.0 verification record](docs/release/verification-0.2.0.md).

## Landing page and monorepo

The desktop app lives in `apps/desktop`; `apps/landing` is the Astro, Tailwind, and shadcn/ui landing site. Root scripts coordinate both apps with Turborepo.

Verified: 246 frontend tests, 128 native tests, the landing production-output test, both type checks, Biome, both production builds, and the desktop browser build. The landing page was checked at 320, 390, and 1280 pixels, including keyboard FAQ controls. A local unpacked macOS build loaded SQLite and retained its entry points and icons. The exact Vercel install/build commands passed in a disposable copy without desktop dependencies. Signed desktop distribution remains pending.

The landing page is live at [copper.potion.sh](https://copper.potion.sh) on Vercel. Cloudflare’s DNS-only CNAME is configured, and HTTPS, page content, the canonical URL, robots.txt, sitemap.xml, and the 404 response have been verified.

Notes and Tasks are now both represented in the landing hero, navigation, dedicated Tasks section, social metadata, README, welcome copy, and demo note. Four refreshed screenshots cover Notes, the Tasks list, the project board, and Appearance. Screenshot preparation uses only demo preview data. Verified: 246 frontend tests, 128 native tests, two landing checks (production output with all four images, plus safe and repeatable demo preparation), both type checks, Biome, both production builds, screenshot helper syntax, and the real capture steps through the shared browser. The production page loads every image and fits 320, 390, and 1440 pixel widths. The standalone screenshot CLI wrapper was syntax-checked; browser steps were executed through T3. The Tasks presentation is published; the landing download link and platform/installation copy now target the first installer release.


## Native acceptance

- [ ] Verify hidden task storage, legacy migration, and Edit source in the next signed macOS build. Local tests cover migration, preserved links, rollback, real filesystem events, hidden Notes content, and Git publish/edit/delete against disposable Vaults. Browser checks against native persistence verified issue/project source menus, saved descriptions, source edits, restored tabs, and menus at 880 and 1280 pixels.
- [ ] Verify note typography and the removed editor focus border in the next signed macOS build. Shared menu/settings controls, native preference persistence, invalid input, and failed saves have local regression coverage. Browser checks against disposable app data verified all fonts, saved preferences, preserved text/undo, keyboard focus, and layouts at 320, 390, and 1280 pixels.
- [ ] Verify optional Vault commit messages in the next signed macOS build. Custom and blank messages, command-menu review, failed-push drafts, and Vault isolation have local regression coverage. Browser checks against disposable local Git remotes verified custom/default commits and the review dialog at 320, 390, and 1280 pixels.
- [ ] Verify repeated Tasks board reordering in the next signed macOS build. Local regression tests cover dense ordering keys, existing-key repair, neighboring-card placement, pending moves, and saved-file recovery. Browser checks against native persistence cover cross-column preview spacing, different card heights, long columns, canceling, dropping, and reloads in a disposable Vault.
- [ ] Complete interactive installation and primary UI flows on Windows and Linux, including mise setup and Copper Dev startup; native CI packaging and SQLite checks passed.

- [ ] Complete attachment-import confirmation, external-link handoff, clipboard, and native development hot-reload checks after the security changes. Packaged opening/editing, Git denial/grant/diff review, remote-image consent, and isolated macOS development startup through mise have been verified.
- [ ] Confirm right-edge painting after manual macOS resizing and moving between displays.
- [ ] Confirm physical window dragging with ordinary native input.
- [ ] Verify the installed app's icon in Finder, Dock, Stage Manager, and Mission Control after replacing any stale installed copy.

## Advanced task workflows

- [ ] Add the index schema/data for task links and checkboxes in ordinary notes.
- [ ] Add parent/dependency links with cycle rejection, milestones, and shared Properties/backlink controls.
- [ ] Add explicit saved views in `.copper/tasks/views.md`; changing a filter must not silently overwrite a saved view.
- [ ] Add a note-task inbox, exact-line checkbox toggling, and conversion to an issue. Keep note tasks out of board cards.
- [ ] Verify the complete flows, accessibility, persistence, and documentation before shipping.

## Follow-up improvements

- [ ] Update the existing Vite 7.3.6 and 8.3.2 dependencies for [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), and [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw). The dependency audit reports two high and four moderate affected entries and fails at CI's moderate threshold. The mise setup changes only package-manager metadata in the lockfile; the application dependency graph is unchanged.
- [ ] Split optional editor language data to reduce large production chunks.
- [ ] Verify and fix accessible names for rendered editor task checkboxes and editable Properties values in the full narrow workspace.

## Future ideas

- [ ] GitHub onboarding for non-Git vaults: sign in, create/link a private repository, and clone from Welcome.
- [ ] Optional idle/on-quit vault backup after the manual commit/push flow is proven.
- [ ] User-created color themes with editing, import/export, validation, preview, and recovery.
- [ ] A plugin system with explicit capabilities, isolation, compatibility, crash recovery, and safe mode.
- [ ] Opt-in custom CSS with documented selectors, live reload, validation, and reliable recovery to the stock UI.
- [ ] Excalidraw canvases as a separate feature, preserving the existing Tasks data model.

## Secrets hardening

Remaining manual steps to scope deploy and signing secrets to the GitHub environment that uses them and rotate tokens. Current deploys keep working until the repo-level copies are deleted, so do the delete step last.

- [ ] Create a new Vercel token for `copper` only: Vercel Account Settings > Tokens > Create, scope it to the team that owns the project, and set an expiration date. Store it as `VERCEL_TOKEN` in the `Production` environment (Settings > Environments > Production > Environment secrets > Add environment secret).
- [ ] Copy `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` into the `Production` environment as environment secrets (the workflow reads them from `secrets.*`, so they cannot be variables). These are not sensitive: the Team ID is under Vercel Team Settings > General and each Project ID is under the Vercel project > Settings > General.
- [ ] Verify: run Actions > Vercel production > Run workflow on `main`. It redeploys the latest stable release. The deploy job runs in `Production` and should finish green with the new token.
- [ ] After the verification run passes, delete the repo-level copies of `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` under Settings > Secrets and variables > Actions > Repository secrets.
- [ ] Revoke the old Vercel token in Account Settings > Tokens once nothing else uses it.
- [ ] Nothing to move for desktop releases: the `release` environment already holds the signing secrets.
