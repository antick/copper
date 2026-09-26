# Copper Agent Instructions

These instructions apply to the whole repository. Read them before making a change, and keep them in force for both the primary agent and any supervised workers.

## Working on changes

Work from the user's request, inspect the affected code, implement the change, and verify it. Keep plans proportional to the task; no separate proposal files or planning-tool commands are required.

## Verification is part of the change

Every implementation must be verified before handoff or commit. Select the full relevant verification set for the affected surface rather than stopping at a single happy-path test:

- run focused tests first, then the related frontend tests, native Node tests, typecheck, and Biome checks;
- run Electron/native tests when the desktop bridge, persistence, or main process is affected;
- run the production web build and relevant browser/accessibility or responsive checks for shell and settings changes;
- inspect the final diff and run `git diff --check` to catch whitespace and patch errors; and
- record failures and remaining risks honestly. Never weaken or delete an assertion merely to make verification pass, and never claim a check was run when it was not.

For documentation-only changes, at minimum check Markdown structure/links with the available project tooling, run `git diff --check`, and review the rendered intent manually.

## TODO.md must stay synchronized

`TODO.md` tracks outstanding product work, verification gaps, and release prerequisites. Update it when work is completed or a concrete follow-up is discovered. Keep future ideas separate from active work and remove obsolete completed checklists.

Before handoff and each commit, check that the tracker agrees with the implementation and actual verification results.

## Coherent commits and integration ownership

Make commits small, reviewable, and logically coherent. Do not mix unrelated cleanup, generated output, speculative features, or drive-by formatting into a product commit. A coherent increment should have a clear purpose, its tests/checks, and the corresponding `TODO.md` progress.

After verification for an implemented change, the primary agent creates the commit(s) automatically. Do not stop at suggesting a commit message and waiting for another prompt. Supervised workers must not commit. The primary agent owns integration, conflict resolution, final verification, and the commit sequence. Do not push unless the user explicitly asks.

## Default supervised Luna Max coordination

For non-trivial work, the primary agent should by default coordinate **3-5 supervised Luna Max workers** through Orca when Orca and Luna Max model access are available. Delegate read-only investigations/reviews or explicitly non-overlapping implementation paths, and give every worker a bounded objective, file ownership, expected deliverable, and verification request. Workers must not edit the same files or competing state; they report findings or changes back to the primary agent.

The primary agent remains responsible for integrating worker output, resolving conflicts, reviewing all changes, running the complete verification set, synchronizing `TODO.md`, and creating coherent commits. Parallel work is an aid to integration, not a substitute for primary-agent ownership.

If Orca or Luna Max access is unavailable, say so explicitly in the plan/handoff and use the documented fallback: the primary agent proceeds sequentially with the available local agent/model, or coordinates only the capabilities that are actually available. Do **not** silently substitute an unapproved model, claim that unavailable workers ran, or create fake parallel work merely to satisfy the default.

## Scope and handoff discipline

Keep edits limited to the user's requested task and owned paths. Ask the coordinator when a task is ambiguous, crosses ownership boundaries, or requires a design decision. At handoff, report changed files, verification commands/results, outstanding risks, any tracker updates still required, and the commit created.

## Shared workspace chrome and parity work

- Notes' shared `WorkspaceTopBar`, `TabStrip`, navigation controls, menu styles, collapsed-sidebar restore, and task property controls are canonical. Tasks and future workspace modules must reuse them instead of creating module-specific headers, tabs, context menus, or duplicate property widgets.
- Workspace modules may supply their own tab targets and trailing actions, but must preserve the shared 42px top-bar geometry, keyboard and pointer tab behavior, focus treatment, drag regions, and responsive overflow.
- Keep module-specific actions such as New issue in the relevant content or project row, not in shared application chrome. A Tasks surface must never expose Notes-only controls such as the note-list toggle.
- Reuse shared dialogs, menus, tooltips, buttons, date formatting, and focus-return behavior. Core entities that appear in multiple Tasks surfaces, including projects and issues, must share their context-menu and icon components.
- Keep Tasks navigation purposeful: All issues is the only built-in destination, while Pinned and Projects are user-managed collections. Per-Vault session state owns their independent order, pins, task tabs, and issue-list column widths; never encode that UI state in Markdown.
- Keep issue lists semantic tables. Resize handles must preserve header/body alignment, expose accessible value semantics and keyboard controls, and use the shared bounded width definitions.
- Treat issue-id prefixes as a native persistence boundary: renderer validation is only feedback, while the main process must normalize and validate before allocating a filename or id. Never rewrite existing issue ids when the prefix changes.
- Window transparency applies only to large background surfaces. Interactive content, cards, fields, menus, dialogs, focus rings, and drag overlays remain opaque, and reduced-transparency or unsupported platforms must use solid surfaces.
- When a request explicitly asks for Linear parity, inspect current verified Linear behavior and documentation before proposing the change, record the concrete reference behavior with the implementation, and verify the implemented core flows in Copper. Match interaction quality and information hierarchy while keeping Copper's local-first data model and design tokens.
