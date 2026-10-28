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

Latest review-fix checks: `mise exec -- pnpm check` passed with 382 frontend tests, 270 native tests, and two cached landing checks; one case-sensitive-filesystem regression was skipped locally. Native watcher tests ran outside the filesystem sandbox, where restricted runs hit `EMFILE`. A watcher run received modified instead of created while builds ran concurrently; the complete rerun passed with unchanged assertions. Typecheck, Biome, production builds, the browser build, dependency audit, and history/worktree secret scan passed. This round added no dependencies; existing pins and the two reviewed audit exceptions are unchanged. These local checks do not replace signed installed-app acceptance.

- [ ] Verify Vault-scoped draft barriers in the next signed macOS build. Local regressions cover persisted drafts, failed queues, global restart protection, and switching Vaults or task documents without crossing save callbacks. A disposable native-Vault browser flow confirmed note rename, task save/source editing, and archive restore succeed while another Vault's draft remains intact.

- [ ] Verify project list/detail count parity for nested sources in the next signed macOS build. Native regressions cover custom statuses and both archive layouts; a disposable native-Vault browser flow confirmed matching totals before and after restoring an issue.

- [ ] Verify search refresh after remote note renames and deletions in the next signed macOS build. Disposable Git clone tests confirm both rename paths are reindexed, stale entries are removed, and filenames with spaces and quotes remain intact. Case-only file and directory renames passed on this case-insensitive Mac filesystem; incremental indexing also checks canonical path spelling, containment, hidden paths, and Markdown file types. The distinct-case/Unicode-name regression needs a case-sensitive filesystem and was skipped locally.

- [ ] Verify the draft safety check before restoring archived task sources in the next signed macOS build. Local regressions cover failed and pending saves; a disposable native-Vault browser flow confirmed blocked restore, draft recovery, preserved restored content, narrow layout, and focus return.

- [ ] Verify duplicate task identity protection in the next signed macOS build. Disk discovery shares indexing's Markdown and hidden-path rules, including nested active tasks and ordinary Archive paths. Unreadable files or directories stop identity discovery, allocation, and restore instead of returning a partial scan; a file that has disappeared is skipped. Regressions cover preserved files/index rows on read failures, issue/project collisions, issue ID aliases, stale indexes, malformed managed metadata, and ID reservation across current and legacy archives without rewriting IDs. A disposable native-Vault browser check confirmed a simulated read failure blocks restore and preserves the archive; retry succeeds after access returns.

- [ ] Verify restored nested task sources in the next signed macOS build. Issue/project lookup now follows the same eligible paths as discovery, preserves stored IDs, and prefers active project matches. Native regressions cover reads, updates, moves, comments, archive, deletion, and hidden/symlink exclusions. Browser checks against a disposable native Vault confirmed issue/project restores, saved descriptions/comments, and Edit source. Project overviews wait for full detail before mounting an editable description; regressions cover delayed detail, retry after failure, and preserving pending edits during refresh. Listing, discovery and detail now share fallback IDs for files without an explicit ID, while stored IDs stay unchanged. ID-less projects retain their original filename-stem ID, keeping existing issue links, pins, order, and saved project tabs intact. Index cache version 4 refreshes unchanged files from older caches, including version 3, without modifying Markdown. Regressions cover linked counts, lookup, persisted navigation, and unlinking issues on project deletion. A disposable native-Vault browser upgrade confirmed the pinned project, restored tab, linked issue count, and board card survive. Regressions cover project and issue read/update parity, nested/archive paths, collisions, and cache upgrades; the browser restored and opened an ID-less project with its description preserved.

- [ ] Verify note recovery and guarded saves, Properties dialogs, archived task/project restore, macOS window reactivation, attachment settings, and punctuation searches in the next signed macOS build. The October 21 audit fixes have local regression and disposable native-Vault browser coverage; that is not installed-app acceptance.

- [ ] Verify recovery when a note moves or disappears during autosave in the next signed macOS build. Rename/delete events and missing-file save results expose the durable draft even with cached editor data; a late save cannot clear it. Regressions cover reopening, newer drafts, and confirming discard without leaving Vault flushes blocked. A disposable native-Vault browser flow confirmed recovery during a pending save, original moved-file contents, no recreated old path, retained draft after reload, and successful flush after discard. The recovery panel passed its accessibility scan and fit 390px with sidebars collapsed.

- [ ] Verify cached-note reopening in the next signed macOS build. The editor waits for its first disk read before accepting body edits; later background reads keep the initialized editor mounted and editable. Five regressions cover unchanged and refreshed text, save/reopen, background reads, property locks, and missing-file draft recovery. A disposable native-Vault browser flow confirmed the opening state, fresh disk text, saved edits, background editing, persistence after reload, and an editor accessibility scan with no violations. The first read must succeed before editing; read failures show a linked error and Retry, with existing drafts retained. Reload keeps editing locked through its read and revision application, including overlapping property writes. New regressions cover delayed Reload, failed reads and retries. Disposable native-Vault browser checks confirmed the lock, fresh retry text, zero accessibility violations, and a 390px panel without horizontal overflow with sidebars collapsed.

- [ ] Verify native task write conflicts and guarded rollback in the next signed macOS build. Issue, comment, and project writes use their read revision; rollback checks the hash returned by Copper's successful write before restoring it. Native regressions preserve external edits/deletions and the original failure during direct updates, rank repair, and project workflow rollback. A disposable native-Vault browser flow confirmed task descriptions and comments survive source opening and reload. The final hash check is not an operating-system atomic compare-and-swap guarantee. Failed issue creation now removes only its unchanged new file and cleans the index best-effort. Regressions preserve external edits, deletions and symlink replacements, the original error, and repaired ranks. A native-Vault browser check confirmed failure keeps the composer draft without a new issue file, then retry creates one intended issue.

- [ ] Verify draft cleanup under unavailable browser storage in the next signed macOS build. Local regressions and a disposable native-Vault browser flow confirm successful saves and Reload finish when removal fails, newer drafts survive, and a neutral storage marker prevents cleared entries reappearing after reload when writes remain available. If all storage writes are blocked, suppression lasts for the current renderer session; old persisted bytes cannot be removed until storage recovers.

- [ ] Verify attachment-folder save failure feedback in the next signed macOS build. Regressions cover repeated failures, rollback, pending saves, successful retry, and Windows-reserved superscript device names. Invalid native imports preserve the source and create no Vault files. Disposable native-Vault browser checks confirmed the linked save error, restored saved value, persisted retry, and accurate reserved-name feedback. The final field/error accessibility scan had no violations and the 390px layout had no horizontal overflow. Safe folder names beginning with two dots now pass the native containment check; traversal and escaping symlinks remain rejected. A saved-settings/import regression and a disposable native-Vault browser check verified `..attachments` imports the original bytes, with no accessibility violations or overflow at 390px. Actual Windows attachment-import acceptance remains pending.

- [ ] Verify Notes folder creation, title renaming, context menus, and source gutters in the next signed macOS build. Local regression tests and browser checks against a disposable native Vault cover root/nested folders, blank note bodies, file extensions, keyboard focus/cancellation, saved drafts, failed renames, and actions on inactive notes. Title renaming compares suffixes without case sensitivity; regressions cover mixed-case `.md`/`.markdown` extensions and a browser check confirmed `Note.MD` becomes `Research.md` with its contents preserved and no duplicate suffix. Rename recovery tests explicitly cover autosave-first and rename-first ordering, with failures kept active until retry; both cases passed repeated runs. Source gutter rows align with text at 880, 1280, and 1920 pixels; font/size/line-spacing changes recalculate metrics while preserving text, selection, and undo. All six font choices were checked in the browser.
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

## Secrets hardening

Remaining manual steps to scope deploy and signing secrets to the GitHub environment that uses them and rotate tokens. Current deploys keep working until the repo-level copies are deleted, so do the delete step last.

- [ ] Create a new Vercel token for `copper` only: Vercel Account Settings > Tokens > Create, scope it to the team that owns the project, and set an expiration date. Store it as `VERCEL_TOKEN` in the `Production` environment (Settings > Environments > Production > Environment secrets > Add environment secret).
- [ ] Copy `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` into the `Production` environment as environment secrets (the workflow reads them from `secrets.*`, so they cannot be variables). These are not sensitive: the Team ID is under Vercel Team Settings > General and each Project ID is under the Vercel project > Settings > General.
- [ ] Verify: run Actions > Vercel production > Run workflow on `main`. It redeploys the latest stable release. The deploy job runs in `Production` and should finish green with the new token.
- [ ] After the verification run passes, delete the repo-level copies of `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` under Settings > Secrets and variables > Actions > Repository secrets.
- [ ] Revoke the old Vercel token in Account Settings > Tokens once nothing else uses it.
- [ ] Nothing to move for desktop releases: the `release` environment already holds the signing secrets.
