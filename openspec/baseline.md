# Existing-product baseline

This baseline was captured from the Copper codebase on branch `chore/openspec` at version 0.2.2. It documents shipped behavior only.

## Method

1. Read repository context from `README.md`, `AGENTS.md`, and architecture notes in `docs/` without treating `PLAN.md` or `TODO.md` as requirements.
2. Map product surfaces to capabilities aligned with user-visible modules and the IPC contract in `apps/desktop/src/lib/copper/command-contract.ts`.
3. For each capability, write `openspec/specs/<capability>/spec.md` with Purpose, Requirements, and scenarios grounded in the files listed in `source-inventory.md`.
4. Validate with `pnpm specs:check` (`openspec validate --all --strict --no-interactive`).

## Capabilities in this baseline

| Capability | Scope |
| --- | --- |
| vault | Open, close, recents, vault id, tree |
| notes-workspace | Shell layout, tabs, tree mutations, welcome |
| markdown-editor | CM6 editing, autosave, preview, attachments |
| tasks | Issues, projects, board, id prefix |
| search-index | FTS index, search, reindex, app-data storage |
| properties-backlinks | Frontmatter, backlinks |
| application-shell | Shared chrome, routing, status bar |
| settings-session | Global settings and per-vault session |
| commands | Registry, palette, IPC validation |
| git-integration | Enable, status, diff, publish |
| desktop-platform | Electron bridge, watcher, updates, dev identity |
| landing-site | Astro marketing site |

## Corrections

If a requirement no longer matches the code, fix the spec through a normal OpenSpec change (proposal, delta specs, archive) rather than editing baseline history in place without a change record.
