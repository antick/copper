# Changelog

## Unreleased

- Use the approved satin-copper C on charcoal across native app icons, favicon, and Welcome; derive all sizes from one checked-in master and preserve the Copper application name.
- Duplicate an issue from the card menu so the copy appears directly below; make the Kanban drop slot card-height and tilt the lifted overlay; apply issue search, filters, sort, and display properties on the board; show a vertical insert bar while reordering tabs; space the Notes title above the body; and keep Pinned/Projects headers on one line, distinct from project rows.
- Show a dashed placement slot where a Kanban card will land, instead of painting an accent bar on the neighboring card.
- Stop same-column Kanban cards from jumping up and snapping back: the overlay is the only moving card, the source stays put, and lane gaps no longer yank the insert target to the end of the column.
- Fix Kanban horizontal scrolling in small windows: the board is the overflow owner, nested lanes no longer trap trackpad or Shift-wheel pans, and a native wheel listener moves the board from cards and empty columns.
- Finish the Linear-style Tasks core with a continuous Notes/Tasks top bar, persistent tabs and sortable pinned projects, compact one-row controls, resizable issue tables, configurable `ISSUE-*` ids, wider bidirectional kanban lanes without snap-back, shared Markdown descriptions, compact workflow forms, background transparency, and one canonical Copper app icon.
- Refine Tasks with one-row project/issue controls, safe macOS dividers, canonical Notes labeling, a searchable Lucide/emoji project picker, In Review, persistent column hide/reorder controls, and a compact end-of-board Add column action.
- Complete the Linear-style Tasks core with shared multi-tab chrome, contextual issue creation, Canceled and project-owned workflow columns, unified boards, polished project icons, right-click project lifecycle actions, and rollback-safe local Markdown persistence.
- Reuse Notes' top bar in Tasks with persistent destination, project, and issue tabs; add per-tab history, preview/pin/close/reopen/reorder behavior, a shared issue peek/full view, multi-selection, and right-click issue actions across lists and boards.
- Rebuild Tasks around a full-width Linear-style workspace with built-in issue destinations, a project directory and Overview/Issues/Board tabs, shared property controls, adaptive issue details, retry-safe composers, and accessible optimistic kanban movement.
- Label the Tasks title row Tasks (not the Vault folder name), open a Linear-style issue composer with description and properties, render the list as a table, and show priority and labels on board cards.
- Reuse Notes chrome in Tasks: `TitleRegion` clears the traffic lights, the rail divider starts below the title row, nav buttons use a pointer cursor, the board fills the window, and New project / New issue open a Create/Cancel dialog.
- Add a Tasks workspace beside Notes: local Markdown issues and projects under `Tasks/`, list and kanban boards, optimistic field writes, and `⇧⌘T` to switch modes. No cloud tracker and no `.copper/` in the Vault.
- Keep macOS traffic lights off the vault name, hide tab-strip scrollbars, open Settings beside the rail with Back, and show a larger colored Git review dialog with Pushing…/Pushed.
- Use the slotted Welcome mark (256px) as the window favicon so Mission Control matches the Dock icon.
- Add a Notes activity rail (vault + settings at the bottom), open Settings as an overlay so the Vault stays mounted, and show a file-stem title above the note body.
- Replace Archive in the primary nav with Favorites, rename the starred list to Pinned (one-line filenames), and move Show source into More.
- Git Vaults use an icon + count that opens a file-list/diff review before the existing publish loop.
- Typing `/` in Markdown Live Preview inserts headings, lists, tasks, quotes, fences, and tables as Markdown. Code files stay the source editor.
- Trim About: drop License and Local data; keep update status on one line.
- Put open-note tabs in the single 42px editor header, move the vault name into the left sidebar header, and keep version on About & Diagnostics. The status bar no longer repeats vault name, version, or Live Preview.
- For Vaults that already have Git at the folder root, a status-bar Push control flushes notes, commits, fetches, combines histories, and pushes to the existing remote. Overlapping notes are kept as siblings such as `Daily (from GitHub).md`. No GitHub login, no automatic backup, and no Git chrome on ordinary folders.
- Keep Chromium framework symlinks relative when copying Electron for `pnpm dev`, so GPU helpers can load `icudtl.dat`.
- Use the Welcome copper disc as the app icon, with the paper slot and canvas punched to real transparency instead of a white or dark plate.
- Migrate the desktop runtime from Tauri 2 / Rust / Bun to Electron / Node.js / pnpm. The React UI still uses TanStack file-based routing; native vault, file, search, and update work runs in the Electron main process.
- Load the Electron preload as CommonJS so Open Vault can talk to the main process (sandboxed ESM preload never attached `copperDesktop`).
- Show Copper, not Electron, as the macOS application menu name.
- Brand the dev Electron binary with Copper’s name and Dock icon so `pnpm dev` no longer shows the stock Electron atom.
- Remove the white plate behind the Copper app icon so the Dock squircle is the dark metal, not a white square.
- Launch `pnpm dev` through electron-vite’s `ELECTRON_EXEC_PATH` so the menu bar and About panel use the branded Copper binary, not stock Electron.
- Replace the centered Welcome card with a two-pane Vault desk: identity on the left, Recent Vaults filling the rest of the launch window.
- Center macOS overlay traffic lights on the 42px header, including when the window is inactive.
- Keep macOS traffic lights clear of the left title bar, move Show/Hide note list into the editor header, and align every left-pane row to one left column.
- Replace file-tree chevrons with open/closed folder icons and tighten nested indent.
- Hide Markdown markers with zero-width widgets and drop unmeasured code-card margins so clicks hit the visible line.
- Stop CSS-collapsing editor lines so clicks and the caret land on the visible line.
- Skip hidden code-fence lines on ArrowUp/ArrowDown, and remove the Live Preview plus gutter.
- Make the editor `+` control insert a line below, remove the inert grip, and restyle fenced code as inset monospace cards.
- Render Markdown fenced code as one readable Live Preview block, without leftover language tags or empty fence bars.
- Hide redundant file extensions from full-tree names when a type badge is shown.
- Align same-depth file-tree folders and files on one icon and name column, and keep those icons from shrinking when the left pane is resized.
- Document the macOS “damaged app” quarantine fix for unsigned downloads.
- Replace the default Tauri icon with a Copper mark.

## 0.1.0 — 2026-08-18

### Changed

- Installers and auto-updates used a separate public release repository. Future verified releases use `antick/copper`; users are not asked for a GitHub token.

### Added

- Tag-triggered GitHub Release workflow for Apple Silicon macOS production builds.
- In-app updater that checks private GitHub Releases, shows status-bar progress, and restarts only after confirmation.
- About & Diagnostics controls to check now, install, and restart.
- Release and install documentation in `docs/release/github.md`.
