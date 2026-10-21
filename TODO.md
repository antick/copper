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

- [ ] Verify Vault-scoped draft barriers in the next signed macOS build. Local regressions cover persisted drafts, failed queues, global restart protection, and switching Vaults or task documents without crossing save callbacks. A disposable native-Vault browser flow confirmed note rename, task save/source editing, and archive restore succeed while another Vault's draft remains intact.

- [ ] Verify project list/detail count parity for nested sources in the next signed macOS build. Native regressions cover custom statuses and both archive layouts; a disposable native-Vault browser flow confirmed matching totals before and after restoring an issue.

- [ ] Verify search refresh after remote note renames and deletions in the next signed macOS build. Disposable Git clone tests confirm both rename paths are reindexed, stale entries are removed, and filenames with spaces and quotes remain intact. Case-only file and directory renames passed on this case-insensitive Mac filesystem; incremental indexing also checks canonical path spelling, containment, hidden paths, and Markdown file types. The distinct-case/Unicode-name regression needs a case-sensitive filesystem and was skipped locally.

- [ ] Verify the draft safety check before restoring archived task sources in the next signed macOS build. Local regressions cover failed and pending saves; a disposable native-Vault browser flow confirmed blocked restore, draft recovery, preserved restored content, narrow layout, and focus return.

- [ ] Verify duplicate task identity protection in the next signed macOS build. Disk discovery shares indexing's Markdown and hidden-path rules, including nested active tasks and ordinary Archive paths. Regressions cover issue/project collisions, issue ID aliases, stale indexes, malformed managed metadata, and ID reservation across current and legacy archives without rewriting IDs. Disposable native-Vault browser checks confirmed rejected restores preserve both files, ordinary restores succeed, and new issues skip IDs reserved by nested and archived tasks; the restore dialog fits 390px.

- [ ] Verify note recovery and guarded saves, Properties dialogs, archived task/project restore, macOS window reactivation, attachment settings, and punctuation searches in the next signed macOS build. The October 21 audit fixes have local regression and disposable native-Vault browser coverage; that is not installed-app acceptance.

- [ ] Verify native task write conflicts and guarded rollback in the next signed macOS build. Issue, comment, and project writes use their read revision; rollback checks the hash returned by Copper's successful write before restoring it. Native regressions preserve external edits/deletions and the original failure during direct updates, rank repair, and project workflow rollback. A disposable native-Vault browser flow confirmed task descriptions and comments survive source opening and reload. The final hash check is not an operating-system atomic compare-and-swap guarantee.

- [ ] Verify draft cleanup under unavailable browser storage in the next signed macOS build. Local regressions and a disposable native-Vault browser flow confirm successful saves and Reload finish when removal fails, newer drafts survive, and a neutral storage marker prevents cleared entries reappearing after reload when writes remain available. If all storage writes are blocked, suppression lasts for the current renderer session; old persisted bytes cannot be removed until storage recovers.

- [ ] Verify attachment-folder save failure feedback in the next signed macOS build. Regressions cover repeated failures, rollback, pending saves, and successful retry. A disposable native-Vault browser flow with an injected bridge failure confirmed the linked error, restored saved value, persisted retry, and a 390px layout without horizontal overflow. Integration checks passed: 338 frontend tests, 217 native tests, two cached landing checks, typecheck, Biome, both production builds, and the desktop browser build; one case-sensitive-filesystem regression was skipped locally.

- [ ] Verify Notes folder creation, title renaming, context menus, and source gutters in the next signed macOS build. Local regression tests and browser checks against a disposable native Vault cover root/nested folders, blank note bodies, file extensions, keyboard focus/cancellation, saved drafts, failed renames, and actions on inactive notes. Source gutter rows align with text at 880, 1280, and 1920 pixels; font/size/line-spacing changes recalculate metrics while preserving text, selection, and undo. All six font choices were checked in the browser.
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

- [ ] Extend durable failed-draft recovery to task descriptions. Notes retain drafts across tabs and restarts; task descriptions still rely on their existing in-memory retry while the editor is open.

- [ ] Split optional editor language data to reduce large production chunks.
- [ ] Verify and fix accessible names for rendered editor task checkboxes and editable Properties values in the full narrow workspace.

## Future ideas

- [ ] GitHub onboarding for non-Git vaults: sign in, create/link a private repository, and clone from Welcome.
- [ ] Optional idle/on-quit vault backup after the manual commit/push flow is proven.
- [ ] User-created color themes with editing, import/export, validation, preview, and recovery.
- [ ] A plugin system with explicit capabilities, isolation, compatibility, crash recovery, and safe mode.
- [ ] Opt-in custom CSS with documented selectors, live reload, validation, and reliable recovery to the stock UI.
- [ ] Excalidraw canvases as a separate feature, preserving the existing Tasks data model.
