# Copper TODO

Track outstanding work and verification here. Completed implementation history lives in Git.

## Public repository and releases

The owner approved a fresh `0.1.0` release using Loadout’s installer approach: ad-hoc-signed macOS, unsigned Windows, and Linux packages. Versions and changelog are reset. Five native build jobs must produce all nine installers before a draft can be published; automatic updates are disabled until their signing and full flow are verified.

Local verification passed 380 tests, both type checks, Biome, the desktop and landing builds, macOS ad-hoc signature verification, and packaged version/SQLite checks. Cross-platform builds and public downloads remain pending.

- [ ] Complete and verify the v0.1.0 installer builds, publish the draft, and verify the public downloads.

- [ ] Configure main/tag protections and a reviewed release environment. Secret scanning, push protection, vulnerability alerts, and private vulnerability reporting are enabled.
- [ ] Add environment-scoped signing credentials and verify a real Developer ID signed/notarized installer and a signed automatic update before enabling signed distribution and automatic updates.
- [ ] Retire the legacy release repository: its history, metadata, and checksum-verified assets are backed up privately, but GitHub rejected deletion because the CLI token lacks `delete_repo` permission. Old clients will need a manual reinstall from this repository once a verified release is available.

The initial source snapshot passed 246 frontend tests, 128 native tests, type checks, lint, web/Electron production builds, a dependency audit, and secret/privacy checks. Updates and release automation target this repository. The protected publishing job uses the automatic GitHub token. Selected demo images are retained in `docs/images`; temporary testing output is ignored.

## Landing page and monorepo

The desktop app lives in `apps/desktop`; `apps/landing` is the Astro, Tailwind, and shadcn/ui landing site. Root scripts coordinate both apps with Turborepo.

Verified: 246 frontend tests, 128 native tests, the landing production-output test, both type checks, Biome, both production builds, and the desktop browser build. The landing page was checked at 320, 390, and 1280 pixels, including keyboard FAQ controls. A local unpacked macOS build loaded SQLite and retained its entry points and icons. The exact Vercel install/build commands passed in a disposable copy without desktop dependencies. Signed desktop distribution remains pending.

The landing page is live at [copper.potion.sh](https://copper.potion.sh) on Vercel. Cloudflare’s DNS-only CNAME is configured, and HTTPS, page content, the canonical URL, robots.txt, sitemap.xml, and the 404 response have been verified.

Notes and Tasks are now both represented in the landing hero, navigation, dedicated Tasks section, social metadata, README, welcome copy, and demo note. Four refreshed screenshots cover Notes, the Tasks list, the project board, and Appearance. Screenshot preparation uses only demo preview data. Verified: 246 frontend tests, 128 native tests, two landing checks (production output with all four images, plus safe and repeatable demo preparation), both type checks, Biome, both production builds, screenshot helper syntax, and the real capture steps through the shared browser. The production page loads every image and fits 320, 390, and 1440 pixel widths. The standalone screenshot CLI wrapper was syntax-checked; browser steps were executed through T3. This update is local and still needs publication.

- [ ] Publish the Tasks presentation update after review.
- [ ] Replace the early-development source/release links with download links after approved installers are available.

## Native acceptance

- [ ] Complete attachment-import confirmation, external-link handoff, clipboard, and native development startup/hot-reload checks after the security changes. Packaged opening/editing, Git denial/grant/diff review, and remote-image consent have been verified.
- [ ] Confirm right-edge painting after manual macOS resizing and moving between displays.
- [ ] Confirm physical window dragging with ordinary native input.
- [ ] Verify the installed app's icon in Finder, Dock, Stage Manager, and Mission Control after replacing any stale installed copy.

## Advanced task workflows

- [ ] Add the index schema/data for task links and checkboxes in ordinary notes.
- [ ] Add parent/dependency links with cycle rejection, milestones, and shared Properties/backlink controls.
- [ ] Add explicit saved views in `Tasks/views.md`; changing a filter must not silently overwrite a saved view.
- [ ] Add a note-task inbox, exact-line checkbox toggling, and conversion to an issue. Keep note tasks out of board cards.
- [ ] Verify the complete flows, accessibility, persistence, and documentation before shipping.

## Follow-up improvements

- [ ] Split optional editor language data to reduce large production chunks.
- [ ] Verify and fix accessible names for rendered editor task checkboxes and editable Properties values in the full narrow workspace.

## Future ideas

- [ ] GitHub onboarding for non-Git vaults: sign in, create/link a private repository, and clone from Welcome.
- [ ] Optional idle/on-quit vault backup after the manual commit/push flow is proven.
- [ ] User-created color themes with editing, import/export, validation, preview, and recovery.
- [ ] A plugin system with explicit capabilities, isolation, compatibility, crash recovery, and safe mode.
- [ ] Opt-in custom CSS with documented selectors, live reload, validation, and reliable recovery to the stock UI.
- [ ] Excalidraw canvases as a separate feature, preserving the existing Tasks data model.
