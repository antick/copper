# Copper Desktop — Master Product & Implementation Plan

> **Runtime note (0.2.0):** Copper now ships Electron + Node.js + pnpm. Sections below that still mention Tauri/`src-tauri`/Bun describe the original 0.1.0 build and are historical unless updated.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> This document is intentionally self-contained. Do not assume access to the conversation that produced it. Read this entire file before changing code.

**Goal:** Build **Copper**, a proprietary desktop-first, local-first Markdown editor/knowledge workspace that is lighter, faster, more reliable, and more polished than typical Electron/web-note applications, with Obsidian-class responsiveness and a UI initially modeled closely on the supplied Tolaria reference before Copper-specific refinements.

**Architecture:** Copper uses an Electron desktop shell with a Node.js main-process core and a React/TypeScript UI. Markdown files in user-selected folders ("Vaults") are the source of truth; SQLite is a disposable derived index/cache only. CodeMirror 6 owns editor state and rendering, TanStack Query owns asynchronous native-backed data, TanStack Router (file-based) owns application-level navigation, and React owns surrounding UI—not the document buffer.

**Tech Stack:** Electron, Node.js, pnpm, React 19, TypeScript, Vite / electron-vite, TanStack Router with file-based routing, TanStack Query, CodeMirror 6, Radix UI primitives, Tailwind CSS, Motion, Lucide React icons, TanStack Virtual where virtualization is required, SQLite + WAL + FTS5 (`better-sqlite3`), `chokidar`, Vitest, React Testing Library.

---

## 1. Product Identity

### 1.1 Name

- Product name: **Copper**
- Repository: **`antick/copper`**
- Desktop app name: **Copper**
- macOS bundle display name: **Copper**
- The repository should remain **private/proprietary for now**.
- Do not attach the Egglify brand in the initial product or UI.
- If brand association becomes useful later, "Copper by Egglify" can be introduced without renaming the product.

### 1.2 Positioning

Initial positioning:

> **Copper — a fast, beautiful, local-first Markdown editor.**

Copper should begin as an excellent Markdown editor and local knowledge workspace, not as an all-in-one productivity suite.

### 1.3 Core principles

1. **Local first**
   - The user's Markdown files belong to the user.
   - No account is required.
   - No cloud is required.
   - Copper must remain useful offline.

2. **Plain files**
   - Markdown files are canonical user data.
   - Copper must not require a proprietary content database.
   - A Vault remains usable in VS Code, Vim, Zed, Obsidian, Finder/Explorer, Git, grep, etc.

3. **Performance is a feature**
   - Smooth typing and scrolling are release criteria.
   - A feature that works but causes frame drops does not pass acceptance.

4. **UI/UX is a feature**
   - Copper exists partly because many otherwise-capable desktop note applications feel clumsy, visually inconsistent, or sluggish.
   - Interaction quality is not deferred polish.

5. **Reliability over cleverness**
   - Never silently lose or overwrite writing.
   - External filesystem changes must be detected correctly.
   - Derived indexes must be rebuildable.

6. **Progressive complexity**
   - Start with an excellent editor/file experience.
   - Do not build cloud sync, collaboration, AI, plugin marketplaces, task management, calendar, or unrelated productivity features into the first release.

---

## 2. Licensing / Code-Reuse Rules

Copper is proprietary for now.

### 2.1 Do not base Copper on restrictive copyleft code

Do **not** copy or fork AGPL/GPL application code into Copper unless the licensing decision is explicitly revisited.

In particular, Tolaria may be used as a **visual/product reference**, not as source code to copy into the proprietary codebase.

Earlier reference applications considered included permissively licensed projects such as Otterly, Tektite, Tangent, Noteriv, and SilverBullet. They may be studied for architectural ideas when their licenses permit it, but Copper should not blindly inherit their architecture or UI.

### 2.2 Dependency rule

Prefer:
- MIT
- BSD
- Apache-2.0
- similarly permissive dependencies

Before introducing a dependency that becomes fundamental to Copper, record:
- license
- maintenance status
- bundle/runtime impact
- reason it is preferable to a small internal implementation

Avoid dependency accumulation for trivial UI helpers.

---

## 3. Why This Stack

### 3.1 Selected stack

```text
Copper
│
├── Desktop shell
│   └── Electron (Chromium)
│
├── Native/core layer
│   └── Node.js (main process)
│
├── Frontend
│   ├── React 19
│   ├── TypeScript
│   └── Vite
│
├── Navigation
│   └── TanStack Router (file-based)
│
├── Async/native data
│   └── TanStack Query
│
├── Editor
│   └── CodeMirror 6
│
├── UI
│   ├── Radix UI primitives
│   ├── Tailwind CSS
│   ├── Motion
│   └── Lucide React
│
├── Virtualization
│   └── TanStack Virtual
│
├── Derived metadata/search
│   └── SQLite + WAL + FTS5
│
├── File watching
│   └── notify
│
└── Tests
    ├── cargo test
    ├── Vitest
    ├── React Testing Library
    └── desktop/e2e smoke tests
```

### 3.2 Tauri vs alternatives

#### Swift/AppKit/TextKit 2
Best raw macOS-native performance ceiling and excellent large-text primitives. If Copper were guaranteed to remain macOS-only, Swift/AppKit would be a serious first choice.

Rejected as the default because Copper should preserve a realistic Windows/Linux path without rewriting the whole UI.

#### Qt
Excellent native performance and mature large-text support. Cross-platform.

Rejected as the default because achieving Copper's highly polished custom interface would cost substantially more UI development time, while the React/CSS ecosystem gives much faster design iteration.

#### Electron
Chosen for one Chromium renderer on every OS, Node.js as the native core language, and a denser upcoming UI (boards, canvases). RAM and installer size are accepted costs. Native work stays in the main process; the renderer stays sandboxed and talks only through `copper.*`.

#### Tauri
Used through 0.1.0. Replaced in 0.2.0 because system WebViews (WKWebView / WebView2 / WebKitGTK) would make later issue-board and Excalidraw surfaces non-deterministic across platforms.

**Important:** Electron does not automatically guarantee a smooth UI. Bad React work, synchronous parsing, excessive CodeMirror decorations, DOM churn, or chatty IPC can still make Copper slow.

---

## 4. Performance Requirements — NON-NEGOTIABLE

The following are product requirements, not stretch goals.

### 4.1 Frame budgets

At 60 Hz:
- total frame budget: ~16.67 ms

At 120 Hz:
- total frame budget: ~8.33 ms

Copper must be designed so routine editor/UI interactions stay inside the current display's frame budget whenever possible.

### 4.2 Interaction targets

| Interaction | Target |
|---|---:|
| Keystroke -> visible character | <16 ms, target <8 ms on capable hardware |
| Cursor movement | next frame |
| Selection drag | locked to display refresh where possible |
| Normal editor scrolling | 60/120 FPS with no sustained dropped frames |
| Hover/pressed state | next frame |
| Sidebar expand/collapse | animation remains inside frame budget |
| Open context menu | <30 ms perceived |
| Open command palette | <30-50 ms |
| Switch already-open note | <30 ms |
| Open normal Markdown note | <50 ms perceived |
| Search UI typing | never blocks input |
| Background index work | must never starve typing/scrolling |
| Idle CPU | approximately 0-1% under normal idle conditions |

A 100 ms response is **not** acceptable for common UI/editor actions.

### 4.3 Performance test corpus

Maintain generated test notes in development fixtures:

```text
10 KB       small.md
100 KB      normal.md
1 MB        large.md
5 MB        huge.md
25 MB       abusive.md
50 MB       abusive-50mb.md
```

Suggested content should include:
- headings
- lists
- long paragraphs
- code fences
- links
- wiki links
- checkboxes
- frontmatter
- inline formatting
- repeated sections
- some images/embeds for progressive-render tests

Performance expectations:

- 10 KB: everything effectively instantaneous
- 100 KB: everything effectively instantaneous
- 1 MB: no perceptible typing/scroll degradation
- 5 MB: typing and scrolling remain smooth; expensive enrichments may become progressive
- 25-50 MB: Copper must remain responsive even if heavy enrichments are reduced or deferred

### 4.4 First engineering gate

**Do not build months of product functionality before proving the editor stack.**

The first technical milestone must exercise:
- Tauri window
- React shell
- CodeMirror 6
- 1/5/25 MB files
- typing
- selection
- scrolling
- live-preview decorations
- images
- code blocks
- 60 Hz and 120 Hz behavior

If Tauri + CodeMirror cannot meet Copper's performance bar after competent optimization, stop and reassess native/Qt before proceeding.

---

## 5. Expected Resource Footprint

These are planning estimates, not promises; benchmark actual release builds.

| Stack | Approx installed app | Approx idle RAM | Approx active working RAM | Performance ceiling |
|---|---:|---:|---:|---|
| Swift/AppKit | 5-25 MB | 30-80 MB | 60-180 MB | Best |
| Qt | 40-100 MB | 60-130 MB | 100-250 MB | Excellent |
| Tauri/Rust/React | 10-35 MB | 70-150 MB | 120-300 MB | Very high |
| Electron/React | 180-300+ MB | 180-300 MB | 250-600+ MB | Very high if well engineered |

Copper's actual performance should be measured and tracked in CI/release testing rather than judged from framework averages.

---

## 6. Fundamental State Ownership

This separation is critical.

### 6.1 CodeMirror owns document/editor state

CodeMirror owns:
- current document text
- cursor
- selection
- undo/redo
- syntax state
- viewport
- folding
- editor decorations

**Do not mirror the full Markdown string into React state on every keystroke.**

Forbidden pattern:

```tsx
const [markdown, setMarkdown] = useState("")
```

if `setMarkdown` is called with the entire document on every editor transaction.

### 6.2 React owns application chrome

React owns:
- sidebars
- toolbars
- dialogs
- menus
- note list
- properties panel
- settings screens
- transient component state

### 6.3 TanStack Router owns application navigation

Use file-based routing for **application screens**, e.g.:

```text
/
├── welcome
├── vault/$vaultId
└── settings
    ├── appearance
    ├── editor
    ├── files
    ├── hotkeys
    └── advanced
```

Do **not** model every Markdown file/pane as a URL route. Tabs, split panes, preview tabs, and the same file in multiple panes are workspace session state, not Router state.

### 6.4 TanStack Query owns asynchronous Rust-backed state

Examples:
- vault tree
- note list queries
- file metadata
- backlinks
- frontmatter/properties
- search results
- index state
- recent vaults

Treat Tauri `invoke()` the same way a web app treats an async data source.

### 6.5 No Zustand initially

Do not add Zustand/Redux by default.

Use:
- CodeMirror state for editor state
- Router for navigation
- Query for async/native data
- React local state/reducer for small UI state

If pane/tab/session state later becomes difficult to manage, evaluate **TanStack Store first**, then Zustand if it is clearly better. Add a store only after a concrete need exists.

---

## 7. Native/API Boundary

Frontend components must not scatter raw Tauri calls throughout the UI.

Use a typed Copper API layer:

```text
src/lib/copper/
├── vaults.ts
├── files.ts
├── search.ts
├── properties.ts
├── backlinks.ts
├── settings.ts
└── events.ts
```

Example conceptual API:

```ts
export const copper = {
  vaults: {
    list,
    open,
    close,
    rescan,
  },
  files: {
    tree,
    read,
    create,
    rename,
    move,
    remove,
    save,
  },
  search: {
    query,
  },
  properties: {
    read,
    update,
  },
}
```

UI components depend on this layer, not directly on `invoke`.

---

## 8. Rust Core Responsibilities

React must not recursively scan thousands of files or compute backlinks itself.

Rust owns:

```text
VaultManager
FileManager
AtomicWriter
FileWatcher
Indexer
SearchEngine
LinkIndex
FrontmatterParser
SettingsRepository
NativeIntegration
```

Rust responsibilities:
- canonicalize Vault paths
- enforce Vault path boundaries
- scan folders
- read/write/rename/move/delete files
- atomic save
- watch external changes
- parse indexable Markdown metadata
- maintain SQLite-derived index
- FTS search
- backlinks/wiki-link resolution
- emit events to frontend
- perform expensive work off the UI thread

---

## 9. Storage Model

### 9.1 Markdown is the source of truth

Example Vault:

```text
My Vault/
├── Inbox/
│   └── quick-thought.md
├── Journal/
│   └── 2026/
│       ├── 08/
│       │   ├── 15.md
│       │   └── 16.md
│       └── index.md
├── Projects/
│   ├── Copper/
│   │   ├── copper.md
│   │   ├── architecture.md
│   │   ├── roadmap.md
│   │   └── Research/
│   │       ├── editor-performance.md
│   │       └── tauri.md
│   └── Egglify/
│       └── ideas.md
├── Resources/
│   ├── Articles/
│   ├── Books/
│   └── Rust/
│       ├── ownership.md
│       └── async.md
├── Templates/
└── attachments/
```

Deleting Copper must not delete the user's knowledge.

### 9.2 SQLite is disposable

Store index/cache outside the user's Vault by default, in Copper's application-data directory:

```text
Copper App Data/
└── vaults/
    └── <vault-path-hash>/
        ├── index.db
        └── session.json
```

Possible tables:

```text
files
- path TEXT PRIMARY KEY
- parent_path TEXT
- name TEXT
- extension TEXT
- size_bytes INTEGER
- mtime_ns INTEGER
- content_hash TEXT
- title TEXT
- frontmatter_json TEXT
- indexed_at INTEGER

headings
- file_path TEXT
- level INTEGER
- text TEXT
- slug TEXT
- line INTEGER

links
- source_path TEXT
- target_raw TEXT
- target_resolved_path TEXT

tags
- file_path TEXT
- tag TEXT

fts_notes (FTS5)
- path UNINDEXED
- title
- body
```

Requirements:
- WAL mode
- FTS5
- schema migrations
- DB deletion + rebuild must recover all derivable content from Markdown
- never make the index the sole location of user-authored note content

### 9.3 Settings

Global settings:
- OS app config directory

Per-Vault session settings:
- app-data directory keyed by Vault
- do not create `.copper/` inside a Vault by default

---

## 10. File Reliability

### 10.1 Atomic saves

Never implement save as:

```text
truncate existing file
write new content
hope nothing fails
```

Required flow:

```text
editor snapshot
  ↓
write temporary file in same directory
  ↓
flush
  ↓
sync where appropriate
  ↓
platform-safe atomic replace
  ↓
update known disk revision
```

### 10.2 Dirty state and disk revisions

For each open file, track:
- path
- last known disk mtime
- size
- hash/revision
- local dirty revision
- last successful save revision

### 10.3 External edits

Rust `notify` watches the Vault.

If another editor changes a file:

**If Copper buffer is clean**
- reload/update buffer
- preserve cursor/scroll where reasonable
- update Query caches/index

**If Copper buffer is dirty**
- do not overwrite either version
- show a non-destructive conflict banner
- actions:
  - Compare
  - Reload Disk Version
  - Keep Mine / Save Mine

### 10.4 Watcher behavior

- debounce duplicate filesystem events
- coalesce related rename/write events
- ignore Copper's own known save events when appropriate
- rescan targeted paths rather than entire Vault when possible
- provide manual "Rescan Vault" command

---

## 11. Editor Architecture

### 11.1 CodeMirror 6

Copper's editor should be built as modular CodeMirror extensions:

```text
src/features/editor/extensions/
├── markdown.ts
├── live-preview.ts
├── wiki-links.ts
├── tags.ts
├── tasks.ts
├── code-fences.ts
├── links.ts
├── images.ts
├── headings.ts
├── folding.ts
└── performance-mode.ts
```

### 11.2 Initial editor features

- CommonMark/GFM-style Markdown editing
- headings
- bold/italic/strike
- lists
- task checkboxes
- blockquotes
- links
- images
- code fences
- inline code
- tables
- frontmatter/YAML
- search/replace
- folding
- syntax highlighting
- `[[wiki links]]`
- `#tags`
- heading navigation
- link autocomplete
- drag/drop attachment insertion

### 11.3 Live Preview

Primary experience should not require permanent:

```text
Markdown source | Preview
```

Instead build a Live Preview mode:
- formatted Markdown appears visually clean when cursor is elsewhere
- syntax markers become editable/revealed when relevant
- checkboxes behave interactively
- links are visually differentiated
- code blocks look polished
- source remains Markdown

A raw/source mode may still exist.

### 11.4 Large-document performance mode

For large/huge documents:
- compute decorations incrementally
- decorate visible viewport + limited lookahead
- do not eagerly render every image/Mermaid/expensive block in the whole file
- avoid full-document decoration rebuild on each keystroke
- reuse/move existing decoration ranges when possible
- defer word counts/backlink parsing/index updates
- keep input and scrolling higher priority than enrichment

---

## 12. UI Direction

### 12.1 Baseline

The provided Tolaria screenshot is the **initial visual baseline**.

The first UI milestone should deliberately reproduce its:
- density
- pane structure
- restrained line-icon style
- neutral/light palette
- compact desktop feel
- typography proportions
- header alignment
- border treatment
- note-list density
- properties-panel density

This is a starting point. Do not copy Tolaria branding, logos, proprietary assets, or source code.

### 12.2 IMPORTANT: Preserve the reference layout before improving it

A previous design iteration changed many unrelated parts when only one change was requested. Do **not** repeat that behavior.

When implementing a requested UI adjustment:
- change only the requested area unless a dependency makes another change unavoidable
- preserve accepted layout/spacing/actions elsewhere
- use screenshot/regression comparison for visual changes

### 12.3 Exact intentional deviation from the reference left sidebar

The initial screenshot contains `VIEWS` and `TYPES`.

Copper must **remove `VIEWS` and `TYPES` entirely**.

Do not replace them with another taxonomy system.

Instead, show the actual nested Vault filesystem tree in that space.

Preserve the other accepted structure around it.

Conceptual left sidebar:

```text
Inbox
All Notes
Archive

FAVORITES
  Personal Journal
  Copper MVP

FOLDERS
  My Vault
    assets
    attachments
    content
      product
      research
        roadmap.md
        ideas.md
    notes
      essays
      daily
        2026
          march
          april
    projects
      copper
        drafts
          outline.md
        architecture.md
        roadmap.md
    archive
```

The point is to visibly demonstrate **nested folders and files**, not a flat folder list.

### 12.4 Terminology

Use **Vault** / **Vaults**, not "Workspace", for top-level user folders.

Concept:
- choose/open a directory -> open a Vault
- one Vault is a normal filesystem folder
- support recent Vaults
- multiple Vault support can follow after the first stable single-Vault workflow

Do not invent cute terminology for files/folders.

### 12.5 Main desktop layout

Initial desktop layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ compact native/title header                                               │
├───────────────┬───────────────────┬──────────────────────────┬─────────────┤
│ Left sidebar  │ Note/result list  │ Editor                   │ Properties  │
│               │                   │                          │             │
│ navigation    │ current query     │ Markdown / Live Preview  │ frontmatter │
│ favorites     │ or folder notes   │                          │ relations   │
│ nested tree   │                   │                          │ backlinks   │
└───────────────┴───────────────────┴──────────────────────────┴─────────────┘
│ compact status bar                                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

All major side panes must be resizable within sane min/max widths.

Suggested starting widths:
- left sidebar: 240-260 px
- note list: 280-320 px
- properties/right sidebar: 270-300 px
- editor: flexible remainder

### 12.6 Compact top area

The top/header area must be compact.

Target visual height:
- approximately 40-44 px per aligned top header row on macOS
- avoid oversized SaaS-style 56-64 px headers

No giant central command/search field occupying the titlebar by default.

### 12.7 Sidebar collapse controls

These were explicitly missing in an earlier mockup.

**Left sidebar**
- visible collapse/toggle button in the upper-left/titlebar region near navigation/window controls
- discoverable tooltip
- keyboard shortcut
- when collapsed, editor/list area reflows immediately

**Right sidebar**
- close/collapse button at the **top-most right of the right sidebar header**
- in the Tolaria-style Properties header, the close `X` belongs there
- do not replace this important affordance with a global Settings button

### 12.8 Settings placement

Do not clutter the upper-right editor/titlebar area with Settings.

Use:
- application menu/command palette
- compact gear in lower/status area if desired
- dedicated Settings route/window

The top-right of the properties panel must remain available for closing that panel.

### 12.9 Icons

Use **Lucide React** as the initial icon set because it provides a coherent simple line language.

Rules:
- standard UI icon sizes: 14/16 px
- major toolbar actions: 16/18 px
- consistent stroke width
- do not mix five different icon families
- labels + icons where the action is not universally obvious
- tooltips for icon-only controls
- avoid decorative icons that do not communicate state/action

Important icon roles:
- sidebar toggle
- back/forward
- search
- sort
- filter
- add/new note
- folder/file
- chevron disclosure
- favorite/star
- status/check
- properties/panel
- code/source
- graph/backlinks later
- more menu
- close right sidebar
- settings
- sync/Git only when those features actually exist

### 12.10 Left file tree behavior

Rows:
- compact ~24-28 px
- folder disclosure chevron
- folder icon
- file icon for Markdown
- clear selected row
- clear keyboard focus row
- indentation ~14-16 px per level

Behavior:
- single click selects
- double-click can pin/open depending on final tab behavior
- right-click context menu
- arrow keys navigate/expand/collapse
- Enter opens
- F2/shortcut rename
- drag/drop move should be a later milestone after basic reliability
- folders and files sort predictably, configurable later

For very large trees, flatten only expanded visible nodes and virtualize the rendered rows.

### 12.11 Note list

Match the compact Tolaria-style density:
- title
- snippet
- small tag/property chips where useful
- modified/created metadata
- subtle separators
- no oversized cards

The list is contextual:
- Inbox -> inbox notes
- All Notes -> all indexed Markdown notes
- Archive -> archive folder/query
- folder selection -> notes in selected folder
- search -> results

### 12.12 Editor header

Keep compact:
- breadcrumb/location on left
- document title/path context
- favorite/star and relevant document actions on right
- no redundant global controls

Avoid placing non-editor actions randomly in this header.

### 12.13 Properties right sidebar

Properties should map to actual Markdown frontmatter.

Example:

```yaml
---
type: essay
status: evergreen
date: 2026-03-11
tags:
  - product
  - research
---
```

The panel can show:
- Type
- Status
- Date
- Tags
- custom frontmatter properties
- backlinks/relations later

Property editing must write valid YAML/frontmatter without damaging note content.

### 12.14 Bottom status bar

Keep compact and desktop-like.

Initial useful items:
- current Vault name
- index state
- file type/mode
- word count
- line/column
- encoding if needed
- app version in About, not necessarily always visible

Do not show fake controls for Git, Sync, Claude, collaboration, etc. until those features exist.

---

## 13. Visual Design System

### 13.1 Do not ship default shadcn aesthetics

Radix primitives are acceptable for behavior/accessibility, but Copper should have its own components and visual language.

Create internal UI primitives:

```text
src/components/ui/
├── button.tsx
├── icon-button.tsx
├── input.tsx
├── tooltip.tsx
├── popover.tsx
├── menu.tsx
├── context-menu.tsx
├── dialog.tsx
├── tabs.tsx
├── tree-row.tsx
├── split-pane.tsx
├── sidebar-header.tsx
├── status-bar.tsx
└── command-menu.tsx
```

### 13.2 Typography

Use system fonts first for native feel and small footprint:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Code:

```css
font-family:
  ui-monospace,
  "SFMono-Regular",
  Menlo,
  Consolas,
  monospace;
```

Do not bundle unnecessary font families in the first release.

### 13.3 Light and dark themes

The supplied Tolaria reference gives the initial **light theme** direction.

Before public beta, provide:
- light
- dark
- system

Do not simply invert colors. Define semantic tokens.

Example token groups:
- app background
- pane background
- elevated/hover background
- text primary/secondary/tertiary
- border subtle/strong
- accent
- destructive
- success
- warning
- selection
- editor syntax tokens

### 13.4 Motion

Use Motion sparingly:
- pane collapse
- menus/popovers if useful
- selection/hover feedback where it improves clarity

Never animate:
- typing
- cursor movement
- scrolling content
- anything that risks editor responsiveness

Respect `prefers-reduced-motion`.

---

## 14. Frontend Project Structure

Recommended starting structure:

```text
copper/
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── welcome.tsx
│   │   ├── vault/
│   │   │   └── $vaultId.tsx
│   │   └── settings/
│   │       ├── route.tsx
│   │       ├── appearance.tsx
│   │       ├── editor.tsx
│   │       ├── files.tsx
│   │       ├── hotkeys.tsx
│   │       └── advanced.tsx
│   ├── app/
│   │   ├── query-client.ts
│   │   └── router.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── shell/
│   │       ├── app-shell.tsx
│   │       ├── left-sidebar.tsx
│   │       ├── note-list-pane.tsx
│   │       ├── editor-pane.tsx
│   │       ├── properties-pane.tsx
│   │       └── status-bar.tsx
│   ├── features/
│   │   ├── vault/
│   │   ├── file-tree/
│   │   ├── notes/
│   │   ├── editor/
│   │   ├── properties/
│   │   ├── search/
│   │   ├── backlinks/
│   │   └── settings/
│   ├── lib/
│   │   └── copper/
│   ├── styles/
│   │   ├── tokens.css
│   │   └── globals.css
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs
│   │   ├── commands/
│   │   ├── vault/
│   │   ├── files/
│   │   ├── watcher/
│   │   ├── index/
│   │   ├── search/
│   │   ├── markdown/
│   │   ├── settings/
│   │   └── errors.rs
│   ├── migrations/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/
│   ├── fixtures/
│   └── e2e/
├── package.json
├── vite.config.ts
└── README.md
```

Files should remain focused. Do not create a 2,000-line `App.tsx` or `editor.ts`.

---

## 15. Query Model

### 15.1 Query keys

Use stable key factories.

Example:

```ts
export const vaultKeys = {
  all: ["vaults"] as const,
  detail: (vaultId: string) => ["vault", vaultId] as const,
  tree: (vaultId: string) => ["vault", vaultId, "tree"] as const,
  notes: (vaultId: string, scope: string) =>
    ["vault", vaultId, "notes", scope] as const,
}

export const fileKeys = {
  detail: (vaultId: string, path: string) =>
    ["file", vaultId, path] as const,
  properties: (vaultId: string, path: string) =>
    ["file", vaultId, path, "properties"] as const,
  backlinks: (vaultId: string, path: string) =>
    ["file", vaultId, path, "backlinks"] as const,
}
```

### 15.2 Mutation invalidation

Examples:

Create file:
- invalidate Vault tree
- invalidate contextual note list
- optimistically select/open created note if appropriate

Rename/move:
- update affected tree cache
- invalidate file metadata
- invalidate links/backlinks
- update open-tab/session references

Delete:
- remove file-related cache entries
- update tree/list
- close or mark affected editor tabs

### 15.3 Watcher events

Rust emits typed events:

```ts
type FileSystemEvent =
  | { type: "created"; path: string }
  | { type: "modified"; path: string }
  | { type: "removed"; path: string }
  | { type: "renamed"; from: string; to: string }
```

Frontend listener maps events to targeted Query invalidation, not blanket `invalidateQueries()` for the entire app on every filesystem event.

---

## 16. Routing

TanStack Router file-based routes are selected because they provide:
- type-safe app navigation
- clean route ownership
- settings sub-routes
- predictable Vite integration
- future deep links

Use Router for:
- Welcome
- Vault shell
- Settings
- About/help screens if added

Do not force:
- tabs
- pane layouts
- every selected note
- editor cursor
- scroll position

into URL state.

---

## 17. Search & Indexing

### 17.1 Start with SQLite FTS5

Do not introduce Tantivy in v1 without profiling evidence.

Search should support:
- filename/title
- body content
- path
- tags
- eventually property filters

### 17.2 Indexing behavior

On Vault open:
1. display shell quickly
2. load cached tree/index if valid
3. scan changed metadata in background
4. index changed/new files
5. remove deleted paths
6. emit progress/state

Do not block opening the editor until the entire Vault is indexed.

### 17.3 Search UX

- shortcut opens search quickly
- keystrokes stay local and responsive
- debounce only the expensive query, not input rendering
- cancel/ignore stale requests
- virtualize long results
- show path/snippet/match highlights
- selecting result opens note immediately

---

## 18. Properties & Frontmatter

Frontmatter parsing/writing must be structurally safe.

Requirements:
- preserve unknown keys
- preserve note body exactly outside frontmatter
- deterministic formatting
- avoid rewriting file unnecessarily when property value is unchanged
- validate supported primitive/list values
- malformed YAML should not destroy the note; show an error state and preserve raw source

Initial property types:
- text
- number
- boolean
- date
- string list/tags

Relations/typed knowledge objects can be later milestones.

---

## 19. Backlinks / Wiki Links

Initial wiki-link syntax:

```md
[[Architecture]]
[[projects/copper/architecture]]
[[Architecture#Performance]]
```

Indexer should store:
- raw target
- resolved path if known
- source file
- heading target where present

Backlinks UI:
- can live in right sidebar beneath Properties or in a dedicated section
- computed from derived index
- clicking opens source note at relevant context when possible

Unresolved wiki links:
- visually distinguish
- offer create-note action later

---

## 20. Tabs / Panes

Do not overbuild this in the first editor proof.

Progression:

1. one selected note
2. multiple tabs
3. pinned vs preview tab behavior if desired
4. split editor panes
5. restore session

Session state is not canonical content and can be stored in app data.

When splits arrive:
- same file may be shown in multiple panes
- each pane can have independent cursor/scroll state
- avoid storing all pane state in Router
- introduce a dedicated session reducer/store only if necessary

---

## 21. Keyboard-First UX

Copper must feel like a desktop editor.

Initial shortcuts (platform-adapted):
- New note
- Open Vault
- Quick open
- Global search
- Command palette
- Save
- Close tab
- Next/previous tab
- Toggle left sidebar
- Toggle right sidebar
- Toggle source/live preview
- Rename file
- Search in current file
- Settings

All commands should be represented in a central command registry so:
- menu items
- command palette
- shortcuts
- tooltips

refer to the same command definitions.

---

## 22. Accessibility

Required:
- full keyboard navigation
- visible focus
- semantic/ARIA labels for icon-only controls
- sufficient contrast
- reduced-motion support
- menus/dialogs/popovers built on accessible primitives
- screen-reader labels for tree disclosure, file type, selection, property controls

Do not trade accessibility for visual minimalism.

---

# IMPLEMENTATION PLAN

## Task 1: Bootstrap Copper and prove the Tauri/React boundary

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/app/router.tsx`
- Create: `src/app/query-client.ts`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/commands/system.rs`
- Create: `src-tauri/tauri.conf.json`
- Test: `src/app/app.test.tsx`
- Test: `src-tauri/src/commands/system.rs` unit test module

**Produces:**
- bootable Tauri 2 app
- React 19 frontend
- Vite
- TanStack Router file generation
- QueryClient
- typed `app_info` Tauri command

- [ ] Create the private `antick/copper` repository and initialize the Tauri/React/TypeScript/Vite project.
- [ ] Install TanStack Router, Router Vite plugin, TanStack Query, CodeMirror 6 packages, Radix primitives as needed, Tailwind, Motion, Lucide React, and test dependencies.
- [ ] Configure file-based routing and verify generated route tree builds.
- [ ] Add `QueryClientProvider` and `RouterProvider` at app root.
- [ ] Implement an `app_info` Rust command returning app name/version/platform.
- [ ] Add one frontend test that renders the index route.
- [ ] Add one Rust test for the app-info data mapping.
- [ ] Run frontend tests, `cargo test`, typecheck, and release build.
- [ ] Commit: `chore: bootstrap Copper desktop app`

**Acceptance:**
- app launches in development and release
- no Next.js/TanStack Start
- Router + Query are wired
- no Zustand/Redux
- no raw `invoke()` in arbitrary page components

---

## Task 2: Build the performance proof before product features

**Files:**
- Create: `src/features/editor/perf/perf-editor.tsx`
- Create: `src/features/editor/create-editor.ts`
- Create: `src/features/editor/editor-theme.ts`
- Create: `scripts/generate-perf-fixtures.mjs`
- Create generated fixtures under: `tests/fixtures/performance/`
- Create: `docs/performance-baseline.md`
- Test: `src/features/editor/perf/perf-editor.test.tsx`

**Produces:**
- CodeMirror editor prototype
- 10KB/100KB/1MB/5MB/25MB/50MB fixtures
- repeatable manual/profiling checklist

- [ ] Generate deterministic Markdown fixtures at all required sizes.
- [ ] Mount CodeMirror directly without mirroring the document into React state.
- [ ] Add basic Markdown syntax highlighting.
- [ ] Add representative viewport-only decorations and a few image/code-block widgets.
- [ ] Measure startup, first paint, typing, selection, and scrolling on 1/5/25 MB fixtures.
- [ ] Record machine/display refresh rate and observed bottlenecks in `docs/performance-baseline.md`.
- [ ] Profile React renders to prove ordinary keystrokes do not rerender the entire app shell.
- [ ] Profile CodeMirror updates to find full-document decoration work.
- [ ] Fix any obvious synchronous work in the input path before proceeding.
- [ ] Commit: `perf: establish Copper editor performance baseline`

**Acceptance:**
- 1 MB note has no perceptible input lag
- 5 MB note remains comfortable to type/scroll
- 25 MB note remains responsive
- no architectural blocker discovered
- if blocker exists, stop and reassess Tauri vs native/Qt rather than proceeding blindly

---

## Task 3: Create Copper's design tokens and Tolaria-baseline shell

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/globals.css`
- Create: `src/components/shell/app-shell.tsx`
- Create: `src/components/shell/title-region.tsx`
- Create: `src/components/shell/left-sidebar.tsx`
- Create: `src/components/shell/note-list-pane.tsx`
- Create: `src/components/shell/editor-pane.tsx`
- Create: `src/components/shell/properties-pane.tsx`
- Create: `src/components/shell/status-bar.tsx`
- Create: `src/components/ui/icon-button.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Test: `src/components/shell/app-shell.test.tsx`

**Produces:**
- four-pane desktop shell
- compact header
- resizable/collapsible side panes
- Copper design primitives

- [ ] Encode semantic light-theme tokens based on the accepted Tolaria reference density/palette.
- [ ] Implement compact aligned top headers around 40-44 px.
- [ ] Implement left sidebar, note-list pane, flexible editor, right Properties pane, status bar.
- [ ] Add resizers without expensive continuous React tree rerenders; use CSS variables/direct lightweight state where appropriate.
- [ ] Put the **left-sidebar collapse control** in the upper-left/titlebar region.
- [ ] Put the **right-sidebar close `X`** at the top-right of the Properties header.
- [ ] Keep Settings out of that right-sidebar close location.
- [ ] Add keyboard commands for toggling both sidebars.
- [ ] Add screenshot/visual regression fixture for the shell.
- [ ] Commit: `feat: add Copper desktop shell`

**Acceptance:**
- visually close to supplied Tolaria baseline
- compact, not oversized
- no Views/Types implementation yet
- sidebars have correct collapse controls
- resizing stays smooth

---

## Task 4: Implement Vault selection and path safety

**Files:**
- Create: `src-tauri/src/vault/mod.rs`
- Create: `src-tauri/src/vault/manager.rs`
- Create: `src-tauri/src/commands/vaults.rs`
- Create: `src/lib/copper/vaults.ts`
- Create: `src/features/vault/queries.ts`
- Create: `src/routes/welcome.tsx`
- Create: `src/routes/vault/$vaultId.tsx`
- Test: `src-tauri/src/vault/manager.rs`
- Test: `src/features/vault/queries.test.ts`

**Interfaces:**
- Produce Rust commands:
  - `open_vault(path) -> VaultInfo`
  - `list_recent_vaults() -> Vec<VaultInfo>`
  - `close_vault(vault_id) -> ()`

- [ ] Write Rust tests for canonicalization and rejecting paths outside the active Vault.
- [ ] Implement Vault identity derived from canonical root path without modifying user files.
- [ ] Implement native folder selection/open flow.
- [ ] Persist recent Vaults in app config.
- [ ] Implement Welcome route with Open Vault and Recent Vaults.
- [ ] Navigate to `/vault/$vaultId` after successful open.
- [ ] Ensure components call `copper.vaults.*`, not raw Tauri IPC.
- [ ] Commit: `feat: add local vault management`

**Acceptance:**
- normal folder opens as Vault
- no `.copper` folder is created
- path traversal outside root is rejected
- terminology shown to user is "Vault"

---

## Task 5: Build nested filesystem tree — replace Tolaria Views/Types only

**Files:**
- Create: `src-tauri/src/files/tree.rs`
- Create: `src-tauri/src/commands/files.rs`
- Create: `src/lib/copper/files.ts`
- Create: `src/features/file-tree/types.ts`
- Create: `src/features/file-tree/queries.ts`
- Create: `src/features/file-tree/flatten-visible-tree.ts`
- Create: `src/features/file-tree/file-tree.tsx`
- Create: `src/features/file-tree/file-tree-row.tsx`
- Test: `src/features/file-tree/flatten-visible-tree.test.ts`
- Test: `src-tauri/src/files/tree.rs`

**Produces:**
- actual nested directory/file tree
- virtualizable visible-node model

- [ ] Write Rust tests for nested folders, Markdown files, hidden-file policy, and deterministic ordering.
- [ ] Implement tree scan in Rust.
- [ ] Define typed `FileTreeNode` response.
- [ ] Flatten only expanded tree nodes for rendering.
- [ ] Render folder chevrons, folder icons, Markdown file icons, indentation, selected/focus states.
- [ ] Preserve the accepted Tolaria sidebar content above it: Inbox, All Notes, Archive, Favorites.
- [ ] **Remove `VIEWS` and `TYPES` and change nothing else in the accepted shell as part of this task.**
- [ ] Insert `FOLDERS` with the actual nested tree in the vacated area.
- [ ] Add keyboard tree navigation.
- [ ] Virtualize when visible row count crosses a measured threshold.
- [ ] Add screenshot regression test to catch unrelated layout changes.
- [ ] Commit: `feat: add nested vault file tree`

**Acceptance:**
- nested folders/files are obvious
- no Views section
- no Types section
- unrelated shell areas remain unchanged

---

## Task 6: File read/create/rename/move/delete API

**Files:**
- Create: `src-tauri/src/files/service.rs`
- Create: `src-tauri/src/files/path.rs`
- Modify: `src-tauri/src/commands/files.rs`
- Modify: `src/lib/copper/files.ts`
- Create: `src/features/file-tree/mutations.ts`
- Test: `src-tauri/src/files/service.rs`

**Produces:**
- safe file CRUD inside Vault

- [ ] Write failing tests for create/read/rename/move/delete.
- [ ] Write path traversal tests for `..`, absolute paths, symlink escape cases where relevant.
- [ ] Implement Markdown file creation.
- [ ] Implement folder creation.
- [ ] Implement rename/move.
- [ ] Implement trash/delete behavior with explicit confirmation where destructive.
- [ ] Wire targeted Query invalidations.
- [ ] Add context menu actions to tree.
- [ ] Commit: `feat: add safe vault file operations`

---

## Task 7: Reliable editor file loading and atomic save

**Files:**
- Create: `src-tauri/src/files/atomic_writer.rs`
- Create: `src-tauri/src/files/revision.rs`
- Modify: `src-tauri/src/files/service.rs`
- Create: `src/features/editor/editor-document.ts`
- Create: `src/features/editor/use-document-save.ts`
- Test: `src-tauri/src/files/atomic_writer.rs`
- Test: `src/features/editor/use-document-save.test.ts`

**Produces:**
- safe read/save
- disk revision tracking
- debounced background save

- [ ] Write Rust tests proving a failed write does not truncate the original file.
- [ ] Implement same-directory temporary write + flush/sync + platform-safe replace.
- [ ] Return/update a `DiskRevision` containing mtime/size/hash.
- [ ] Load selected file content directly into CodeMirror.
- [ ] Keep editor document outside React state.
- [ ] Debounce persistence without delaying visible input.
- [ ] Show subtle dirty/saving/saved state without noisy animations.
- [ ] Ensure close/quit flushes or prompts when required.
- [ ] Commit: `feat: add reliable atomic note saving`

---

## Task 8: External file watcher and conflict protection

**Files:**
- Create: `src-tauri/src/watcher/mod.rs`
- Create: `src-tauri/src/watcher/service.rs`
- Create: `src/lib/copper/events.ts`
- Create: `src/features/editor/external-change-banner.tsx`
- Test: `src-tauri/src/watcher/service.rs`

**Produces:**
- external file synchronization
- conflict UI

- [ ] Create watcher event normalization tests.
- [ ] Implement `notify` watcher per open Vault.
- [ ] Debounce/coalesce duplicate events.
- [ ] Emit typed create/modify/remove/rename events.
- [ ] Invalidate targeted Query keys.
- [ ] Auto-reload clean open documents.
- [ ] For dirty buffers, show Compare / Reload Disk / Keep Mine actions.
- [ ] Ensure Copper's own saves do not produce destructive reload loops.
- [ ] Commit: `feat: handle external vault changes safely`

---

## Task 9: Build the real Markdown editor

**Files:**
- Create: `src/features/editor/copper-editor.tsx`
- Create editor extension files listed in Section 11
- Test: `src/features/editor/*.test.ts`

**Produces:**
- polished CodeMirror Markdown editor
- baseline editing feature set

- [ ] Add Markdown/GFM language support.
- [ ] Add Copper editor theme from semantic tokens.
- [ ] Add heading/list/blockquote/code/link/table/task behavior.
- [ ] Add frontmatter syntax.
- [ ] Add search/replace and folding.
- [ ] Add `[[wiki link]]` parser/highlighting.
- [ ] Add `#tag` highlighting.
- [ ] Add attachment/image rendering for visible ranges.
- [ ] Keep React render count stable while typing.
- [ ] Re-run all performance fixtures after each heavy extension group.
- [ ] Commit: `feat: add Copper markdown editor`

---

## Task 10: Implement Live Preview without sacrificing performance

**Files:**
- Create: `src/features/editor/extensions/live-preview.ts`
- Create: `src/features/editor/extensions/live-preview-decorations.ts`
- Create: `src/features/editor/extensions/performance-mode.ts`
- Test: `src/features/editor/extensions/live-preview.test.ts`

**Produces:**
- Obsidian-like source-aware Live Preview
- large-document degradation strategy

- [ ] Write tests for formatting marker visibility around selection/cursor.
- [ ] Implement inline marks for bold/italic/strike/link syntax.
- [ ] Implement interactive task checkboxes.
- [ ] Implement headings and code-block visual treatment.
- [ ] Restrict expensive decoration computation to changed/visible ranges.
- [ ] Add size thresholds that progressively defer heavy embeds.
- [ ] Benchmark 1/5/25 MB notes again.
- [ ] Do not ship Live Preview if it causes persistent dropped frames; optimize before feature expansion.
- [ ] Commit: `feat: add performant markdown live preview`

---

## Task 11: SQLite derived index

**Files:**
- Create: `src-tauri/src/index/mod.rs`
- Create: `src-tauri/src/index/db.rs`
- Create: `src-tauri/src/index/schema.rs`
- Create: `src-tauri/src/index/indexer.rs`
- Create: `src-tauri/migrations/0001_initial.sql`
- Test: `src-tauri/src/index/indexer.rs`

**Produces:**
- WAL/FTS5 derived index
- incremental scan

- [ ] Create schema/migration tests.
- [ ] Enable WAL.
- [ ] Create `files`, `headings`, `links`, `tags`, and FTS5 tables.
- [ ] Index Markdown files asynchronously.
- [ ] Skip unchanged files using mtime/size/hash strategy.
- [ ] Remove index rows for deleted files.
- [ ] Implement full rebuild command.
- [ ] Test deleting `index.db` and rebuilding from Vault.
- [ ] Commit: `feat: add disposable vault search index`

---

## Task 12: Fast search and contextual note list

**Files:**
- Create: `src-tauri/src/search/mod.rs`
- Create: `src-tauri/src/commands/search.rs`
- Create: `src/lib/copper/search.ts`
- Create: `src/features/search/queries.ts`
- Create: `src/features/search/search-results.tsx`
- Modify: `src/components/shell/note-list-pane.tsx`
- Test: `src-tauri/src/search/mod.rs`
- Test: `src/features/search/search-results.test.tsx`

**Produces:**
- FTS search
- virtualized note/results list

- [ ] Write search tests for title/body/path/tag matches.
- [ ] Implement FTS result ranking/snippets.
- [ ] Implement cancellable/stale-safe frontend querying.
- [ ] Implement note-list modes: Inbox, All Notes, Archive, selected folder, Search.
- [ ] Match Tolaria-like compact rows: title, snippet, small chips, timestamps.
- [ ] Virtualize large lists.
- [ ] Verify typing in search input never blocks while query results update.
- [ ] Commit: `feat: add fast local note search`

---

## Task 13: Frontmatter-backed Properties panel

**Files:**
- Create: `src-tauri/src/markdown/frontmatter.rs`
- Create: `src-tauri/src/commands/properties.rs`
- Create: `src/lib/copper/properties.ts`
- Create: `src/features/properties/properties-panel.tsx`
- Create: `src/features/properties/property-row.tsx`
- Test: `src-tauri/src/markdown/frontmatter.rs`

**Produces:**
- actual Properties panel matching reference placement
- safe YAML frontmatter updates

- [ ] Write parser tests for no frontmatter, valid frontmatter, malformed YAML, lists, dates, booleans.
- [ ] Write mutation tests proving the Markdown body remains byte-for-byte unchanged outside the frontmatter range.
- [ ] Render Type/Status/Date/Tags/custom keys.
- [ ] Implement edits through Rust file mutation, not fragile regex in components.
- [ ] Keep right-sidebar close button at top-most right.
- [ ] Add empty-state/Add property behavior.
- [ ] Commit: `feat: add markdown properties panel`

---

## Task 14: Wiki-link index and backlinks

**Files:**
- Create: `src-tauri/src/markdown/links.rs`
- Create: `src-tauri/src/index/backlinks.rs`
- Create: `src-tauri/src/commands/backlinks.rs`
- Create: `src/lib/copper/backlinks.ts`
- Create: `src/features/backlinks/backlinks-section.tsx`
- Test: `src-tauri/src/markdown/links.rs`

**Produces:**
- wiki-link resolution
- backlinks

- [ ] Parse `[[Note]]`, path-qualified links, and heading fragments.
- [ ] Resolve links relative to Vault index.
- [ ] Persist derived link graph.
- [ ] Query backlinks for selected note.
- [ ] Render compact backlink rows in the right panel beneath Properties or an expandable section.
- [ ] Clicking backlink opens source note/context.
- [ ] Commit: `feat: add wiki links and backlinks`

---

## Task 15: Command registry and keyboard workflow

**Files:**
- Create: `src/app/commands/registry.ts`
- Create: `src/app/commands/types.ts`
- Create: `src/components/ui/command-menu.tsx`
- Create: `src/features/settings/hotkeys.tsx`
- Test: `src/app/commands/registry.test.ts`

**Produces:**
- command palette
- central shortcut definitions

- [ ] Define command IDs for core actions.
- [ ] Bind menu/keyboard/command-palette labels to the same registry.
- [ ] Add quick open.
- [ ] Add global search.
- [ ] Add new note/open Vault/save/rename/toggle sidebars/toggle preview/settings commands.
- [ ] Ensure shortcuts adapt to macOS vs Windows/Linux modifiers.
- [ ] Add conflict detection for user-editable shortcuts later.
- [ ] Commit: `feat: add keyboard command system`

---

## Task 16: Tabs and session restore

**Files:**
- Create: `src/features/tabs/types.ts`
- Create: `src/features/tabs/session-reducer.ts`
- Create: `src/features/tabs/tab-strip.tsx`
- Create: `src-tauri/src/settings/session.rs`
- Test: `src/features/tabs/session-reducer.test.ts`

**Produces:**
- multi-tab editing
- saved local session

- [ ] Define tab state independent of Router.
- [ ] Add open/activate/close/reorder tab reducer actions.
- [ ] Wire selected file from tree/list/search into tabs.
- [ ] Persist open tabs/active tab per Vault.
- [ ] Restore safely when files were renamed/deleted externally.
- [ ] Ensure switching an already-loaded tab feels <30 ms.
- [ ] Commit: `feat: add editor tabs and session restore`

---

## Task 17: Settings and themes

**Files:**
- Use routes under `src/routes/settings/`
- Create: `src/features/settings/settings-layout.tsx`
- Create: `src-tauri/src/settings/repository.rs`
- Create: `src/lib/copper/settings.ts`
- Test: settings repository/frontend tests

**Produces:**
- Appearance
- Editor
- Files
- Hotkeys
- Advanced settings

- [ ] Store global settings in app config.
- [ ] Add Light/Dark/System.
- [ ] Add editor font size, line height, tab size, wrapping.
- [ ] Add attachment folder preference.
- [ ] Add autosave/debounce options only if user-facing configuration is truly needed.
- [ ] Keep Settings out of the Properties close location.
- [ ] Commit: `feat: add Copper settings`

---

## Task 18: Drag/drop attachments and links

**Files:**
- Create: `src-tauri/src/files/attachments.rs`
- Create: `src/features/editor/extensions/drop-files.ts`
- Test: attachment service/editor tests

**Produces:**
- local attachment import
- Markdown insertion

- [ ] Copy/move dropped attachments into configured Vault attachment folder.
- [ ] Resolve duplicate filenames deterministically.
- [ ] Insert relative Markdown image/link syntax.
- [ ] Reject unsupported/out-of-Vault unsafe operations.
- [ ] Keep file copying off editor input path.
- [ ] Commit: `feat: add local attachment workflow`

---

## Task 19: Performance hardening pass

**Files:**
- Update: `docs/performance-baseline.md`
- Create: `docs/performance-budget.md`
- Add benchmark/profiling scripts as needed
- Modify only bottlenecked production files identified by profiling

**Produces:**
- measured release candidate performance

- [ ] Re-profile 10KB/100KB/1MB/5MB/25MB/50MB documents.
- [ ] Measure cold/warm note open.
- [ ] Measure tab switching.
- [ ] Measure tree/list rendering with 1k/10k/50k files.
- [ ] Measure search result list with 10k results.
- [ ] Test indexing while typing/scrolling.
- [ ] Test watcher storm while editing.
- [ ] Remove polling loops and unnecessary timers.
- [ ] Verify idle CPU approximately 0-1%.
- [ ] Fix any interaction that regularly misses the frame budget.
- [ ] Commit: `perf: enforce Copper interaction budgets`

---

## Task 20: Reliability / destructive-operation pass

**Files:**
- Add targeted integration tests under `src-tauri/tests/`
- Add frontend conflict/destructive-action tests

**Produces:**
- confidence against data loss

- [ ] Simulate save failure/disk-full style errors where testable.
- [ ] Simulate external edit during dirty buffer.
- [ ] Simulate rename while note is open.
- [ ] Simulate delete while note is open.
- [ ] Simulate Vault removal/unmounted external drive.
- [ ] Simulate corrupt/rebuildable SQLite DB.
- [ ] Verify no scenario silently discards the only copy of user text.
- [ ] Commit: `test: harden Copper file reliability`

---

## Task 21: Packaging and platform QA

**Files:**
- Update: `src-tauri/tauri.conf.json`
- Create platform packaging documentation under `docs/release/`
- Create CI workflows

**Produces:**
- macOS-first distributable
- Windows/Linux readiness checks

- [ ] Configure Copper bundle identifiers/icons/metadata.
- [ ] Produce signed/notarized macOS build when credentials are available.
- [ ] Verify native window controls/titlebar behavior.
- [ ] Verify compact shell at common Retina resolutions.
- [ ] Test Windows WebView2 rendering before calling cross-platform support stable.
- [ ] Test Linux WebKitGTK separately; do not assume macOS behavior.
- [ ] Track release binary size/RAM/startup against baseline.
- [ ] Commit: `build: prepare Copper desktop releases`

---

# 23. Explicitly Deferred Features

Do **not** add these to initial scope simply because other note apps have them:

- account system
- cloud sync
- collaboration
- mobile app
- web app
- AI chat
- AI agent
- MCP integration
- plugin marketplace
- calendar
- reminders
- habits
- task-management suite
- database/notion-style arbitrary block system
- canvas/whiteboard
- graph visualization
- Git UI/sync
- publishing/CMS
- team workspaces

Some may become future Copper features, but they must not compromise editor quality.

---

# 24. Potential Future Milestones

After the core editor is stable:

1. split panes
2. graph view
3. advanced property queries
4. templates
5. daily notes
6. Git integration
7. optional sync
8. plugin/extension API
9. canvas/whiteboard
10. mobile companion
11. AI/agent features

Each requires a separate design/spec before implementation.

---

# 25. Performance Anti-Patterns — Reject in Review

Reject PRs that introduce these patterns without compelling profiling evidence:

### React owns the whole Markdown document

```tsx
const [markdown, setMarkdown] = useState(fullDocument)
```

updated on every keypress.

### Synchronous Rust roundtrip during input

```text
keypress
-> invoke
-> filesystem/database
-> response
-> render
```

### Full-Vault work on a tiny filesystem event

```text
one file modified
-> rescan 50,000 files
-> rebuild everything
```

### Full-document decoration rebuild per edit

```text
one character typed
-> parse/decorate entire 5 MB document
```

### Rendering unbounded lists

```text
50,000 files
-> 50,000 React DOM rows
```

### Giant application store

Do not put:
- CodeMirror document
- query cache
- router state
- filesystem tree
- every pane
- every modal

into one global Zustand/Redux store.

### Polling

Do not poll filesystem/search/index state every second when event-driven mechanisms exist.

### Pretty-but-janky animation

If an animation drops frames, remove or simplify it.

---

# 26. Quality Gates for Every UI Change

For any change to a frequently used interaction, reviewer must check:

1. **Does it work?**
2. **Does it preserve accepted surrounding UI instead of casually redesigning unrelated areas?**
3. **Is it keyboard accessible?**
4. **Does it have correct icon/tooltip semantics?**
5. **Does it feel immediate?**
6. **Does it remain smooth in a large Vault/large note?**
7. **Does it behave correctly in light/dark mode?**
8. **Did it introduce unnecessary React rerenders?**
9. **Does visual regression show only intended changes?**

---

# 27. UI Baseline Checklist

The first polished Copper window should satisfy all of these:

- [ ] macOS-native-feeling window chrome
- [ ] compact top/header area
- [ ] left-sidebar collapse button visible
- [ ] back/forward navigation in appropriate top-left area
- [ ] Inbox / All Notes / Archive retained
- [ ] Favorites retained
- [ ] `VIEWS` removed
- [ ] `TYPES` removed
- [ ] nested real folder/file tree shown instead
- [ ] folder chevrons/indentation are clear
- [ ] note list is compact
- [ ] editor dominates available width
- [ ] Properties right sidebar exists
- [ ] right-sidebar `X` is top-most right within its header
- [ ] Settings is not incorrectly occupying the right-sidebar-close location
- [ ] visual icon family is consistent
- [ ] borders/dividers are subtle
- [ ] status bar is compact
- [ ] no fake sync/Git/AI controls
- [ ] pane resize/collapse is smooth
- [ ] editor typing/scrolling is smooth

---

# 28. Definition of MVP

Copper MVP is complete when a user can:

1. install and launch Copper
2. open a normal local folder as a Vault
3. browse a nested folder/file tree
4. create/rename/move/delete Markdown files safely
5. open notes from tree or contextual list
6. edit Markdown in a polished CodeMirror Live Preview experience
7. see/save YAML-backed properties
8. search the Vault quickly
9. use wiki links/backlinks
10. switch among tabs
11. edit the same Vault externally without silent corruption
12. restart Copper and restore a sensible session
13. use core flows primarily by keyboard
14. use light/dark/system theme
15. work offline with no account
16. delete Copper's index and rebuild it without losing authored content

And, most importantly:

17. typing and scrolling do not develop the dropped-frame/large-note behavior that motivated Copper in the first place.

---

# 29. Final Architecture Summary

```text
                         COPPER
┌─────────────────────────────────────────────────────┐
│ React application chrome                            │
│                                                     │
│  Left       Note list       Editor       Properties │
│  sidebar                    CodeMirror               │
│                                                     │
│ Router: screens                                     │
│ Query: async Rust-backed state                       │
│ React: UI only                                      │
└────────────────────────┬────────────────────────────┘
                         │ async Tauri commands/events
┌────────────────────────▼────────────────────────────┐
│ Rust Core                                            │
│                                                     │
│ Vaults  Files  Atomic Save  Watcher  Index  Search │
│ Markdown parsing  Backlinks  Settings              │
└───────────────┬──────────────────┬──────────────────┘
                │                  │
                ▼                  ▼
        Markdown Files        SQLite + FTS5
        SOURCE OF TRUTH       DISPOSABLE INDEX
```

**The key architectural sentence:**

> Copper is an editor engine that uses React for its surrounding UI; it is not a React application that happens to contain an editor.

---

# 30. Agent Instructions

When an LLM/agent executes this plan:

1. Do not silently change the selected technology stack.
2. Do not add Zustand/Redux unless a later approved design requires it.
3. Do not fork/copy Tolaria source code.
4. Do not introduce AGPL/GPL code into the proprietary app.
5. Do not redesign accepted UI areas while implementing a narrowly scoped UI request.
6. Treat the supplied Tolaria screenshot as the initial layout/density reference.
7. The only deliberate first-pass left-sidebar change from that reference is:
   - remove Views
   - remove Types
   - insert nested actual filesystem tree
8. Always preserve visible left/right sidebar collapse controls.
9. Keep the top bar compact.
10. Do not use a giant SaaS-style search bar in the titlebar unless separately approved.
11. Do not show nonfunctional feature buttons merely to mimic a screenshot.
12. Profile before "optimizing."
13. Never compromise data integrity for speed.
14. Never compromise typing/scrolling responsiveness for background features.
15. Keep tasks small, tests explicit, and commits frequent.
16. Run the performance fixture suite after any change to editor parsing, decorations, embeds, layout, or the Rust/frontend data boundary.

---

# 31. Suggested Implementation Order

Execute in this order:

```text
1  Bootstrap
2  Performance proof
3  UI shell
4  Vault opening/path security
5  Nested filesystem tree
6  File CRUD
7  Atomic saving
8  Watcher/conflicts
9  Markdown editor
10 Live Preview
11 SQLite index
12 Search/note list
13 Properties
14 Wiki links/backlinks
15 Commands/shortcuts
16 Tabs/session
17 Settings/themes
18 Attachments
19 Performance hardening
20 Reliability hardening
21 Packaging
```

Do not move search, graph, AI, or other attractive features ahead of file reliability and editor performance.

---

# 32. Final Non-Negotiables

If implementation decisions become ambiguous, resolve them in favor of these:

**Performance**
> No perceptible typing lag. No routine dropped-frame scrolling. No UI action waiting on filesystem/database IPC unnecessarily.

**Reliability**
> User Markdown is sacred. Save atomically. Detect external changes. Never silently overwrite conflicting work.

**Ownership**
> Markdown is canonical. SQLite is disposable.

**UI**
> Compact, beautiful, desktop-native feeling, consistent icons, deliberate placement, no random toolbar clutter.

**Scope**
> Desktop-first local Markdown editor before becoming anything broader.

**Architecture**
> Rust does native/heavy work. CodeMirror owns the editor. React owns chrome. Query owns async data. Router owns screens.

**Development behavior**
> Change exactly what was requested. Do not "improve" ten unrelated UI areas while implementing one requested adjustment.
