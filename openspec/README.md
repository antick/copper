# OpenSpec in Copper

This directory holds the spec-driven workflow for Copper: living behavior specs, proposed changes, and archived deltas.

## Layout

- `config.yaml` project context and artifact rules for OpenSpec workflows
- `baseline.md` snapshot of how the existing-product baseline was captured
- `source-inventory.md` maps each capability to traceable source files
- `specs/<capability>/spec.md` current behavior contracts (source of truth)
- `changes/` active change proposals (one folder per change)
- `changes/archive/` completed changes kept for history

## Commands

From the repository root:

```sh
pnpm specs        # validate all specs and changes (non-strict)
pnpm specs:check  # validate with --strict (CI-friendly)
```

Workflow skills live under `.agents/skills/`, `.claude/skills/`, `.cursor/skills/`, and `.dsh/skills/` (see each `openspec-*` skill). Start exploration with the explore skill, then propose, apply, update, sync, and archive changes through the matching skills.

## Baseline policy

Baseline requirements describe behavior that exists in the codebase today. Planned work in `PLAN.md` or `TODO.md` is not baseline until it ships. When behavior changes, open a change under `changes/` with delta specs and archive into `specs/` when done.
