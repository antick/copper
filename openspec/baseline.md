# Existing-product baseline

## Provenance

Created from freshly fetched `origin/main` at
`3d3924ea2e223c2c12b786827aed6aa308102cfa` on 2026-10-30.
The adoption branch `chore/openspec` was created from that revision.
No production vaults, private user data or release signing artifacts were imported.

This is a source-inspected baseline of core contracts. References to tests mean
existing coverage was identified, not that every test or packaged desktop workflow passed
in this adoption. See the PR validation report for commands actually run.

## Coverage

| Existing area | Baseline spec | Remaining depth to audit |
| --- | --- | --- |
| Vault open, recents, tree | vault | Full permission revocation, cross-platform path edge cases |
| Notes shell, tabs, file tree | notes-workspace | Every tree mutation, archive view and pinned workflow |
| Markdown editor and saves | markdown-editor | Every extension, performance mode and conflict branch |
| Tasks issues, projects, board | tasks | Full recurrence, comments, attachments and signed macOS board acceptance |
| Search and SQLite index | search-index | Reindex failure recovery and large vault performance gates |
| Properties and backlinks | properties-backlinks | Every property type and link variant in live preview |
| Shared shell and routing | application-shell | Full keyboard map, transparency and responsive overflow |
| Settings and session | settings-session | Every settings route and migration of legacy session fields |
| Commands and palette | commands | Complete shortcut matrix across Notes and Tasks |
| Git publish in vault | git-integration | Live remote credentials, trust prompts and case renames |
| Electron IPC, watcher, updates | desktop-platform | Packaged update acceptance on every release platform |
| Marketing site | landing-site | Accessibility, responsive layout and download link policy |

Detailed product intent in `PLAN.md` and release checklists in `TODO.md` remain
indexed in [source-inventory.md](source-inventory.md). Being indexed is not
equivalent to being fully specified or behaviorally verified.

## Known documentation conflicts

- `PLAN.md` describes an earlier Tauri-oriented architecture. The shipped product
  is Electron with the layout documented in `README.md` and `apps/desktop/`.
- `TODO.md` lists signed macOS acceptance and verification gaps. Those items are
  not baseline requirements until recorded in specs after verified implementation.

The adoption does not rewrite those historical documents wholesale. When changing
an affected area, reconcile live docs with verified code and update the spec and
this gap record together.

## Completing and maintaining the baseline

For each row above, expand the named depth into observable requirements and
success, conflict, failure and recovery scenarios. Attach implementation and test
references in the source inventory. Add missing behavior tests before claiming
coverage. Mark an area fully audited only with recorded evidence; do not mass-convert
old plan tasks into completed requirements. Keep proposed improvements in `changes/`,
separate from what the current system actually does.
