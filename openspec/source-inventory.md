# Baseline source inventory

Inventory at `3d3924ea2e223c2c12b786827aed6aa308102cfa`. Links are discovery
aids, not claims of complete spec coverage or successful test execution.
Read [baseline.md](baseline.md) for conflicts and gaps. Runtime contracts also
live in `apps/desktop/src/lib/copper/command-contract.ts` and native modules under
`apps/desktop/electron/native/`.

Maintain this index when adding or moving relevant sources. Keep historical
plans distinguishable from implementation evidence.

## Product and agent guidance

- [README.md](../README.md)
- [AGENTS.md](../AGENTS.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [PLAN.md](../PLAN.md) (historical intent, not baseline proof)
- [TODO.md](../TODO.md) (verification gaps, not baseline proof)
- [SECURITY.md](../SECURITY.md)

## Architecture and release docs

- [docs/INSTALL.md](../docs/INSTALL.md)
- [docs/release/github.md](../docs/release/github.md)
- [docs/release/linux.md](../docs/release/linux.md)
- [docs/release/windows.md](../docs/release/windows.md)

## Vault and filesystem

- [Vault native service](../apps/desktop/electron/native/vaults.ts)
- [Path canonicalization](../apps/desktop/electron/native/path.ts)
- [File service](../apps/desktop/electron/native/files/service.ts)
- [Atomic writes](../apps/desktop/electron/native/atomic-write.ts)
- [Renderer vault API](../apps/desktop/src/lib/copper/vaults.ts)
- [Welcome and vault routes](../apps/desktop/src/routes/welcome.tsx)
- [Vault route](../apps/desktop/src/routes/vault/$vaultId.tsx)
- [Vault native tests](../apps/desktop/electron/native/vaults.test.ts)

## Notes workspace

- [App shell](../apps/desktop/src/components/shell/app-shell.tsx)
- [Notes workspace](../apps/desktop/src/components/shell/notes-workspace.tsx)
- [File tree](../apps/desktop/src/features/file-tree/file-tree.tsx)
- [Tab session](../apps/desktop/src/features/tabs/session-reducer.ts)
- [App shell tests](../apps/desktop/src/components/shell/app-shell.test.tsx)
- [Notes usability tests](../apps/desktop/src/components/shell/notes-usability.test.tsx)

## Markdown editor

- [Copper editor](../apps/desktop/src/features/editor/copper-editor.tsx)
- [Document save queue](../apps/desktop/src/features/editor/document-save-queue.ts)
- [Live preview](../apps/desktop/src/features/editor/extensions/live-preview.ts)
- [Document persistence tests](../apps/desktop/src/features/editor/document-persistence.test.tsx)

## Tasks

- [Task paths](../apps/desktop/shared/task-paths.ts)
- [Tasks service](../apps/desktop/electron/native/tasks/service.ts)
- [Project service](../apps/desktop/electron/native/tasks/project-service.ts)
- [Issue ids](../apps/desktop/electron/native/tasks/ids.ts)
- [Tasks workspace](../apps/desktop/src/features/tasks/tasks-workspace.tsx)
- [Issue board](../apps/desktop/src/features/tasks/issue-board.tsx)
- [Tasks service tests](../apps/desktop/electron/native/tasks/service.test.ts)
- [Tasks workspace tests](../apps/desktop/src/features/tasks/tasks-workspace.test.tsx)

## Search and index

- [Index schema](../apps/desktop/electron/native/index/schema.ts)
- [Indexer](../apps/desktop/electron/native/index/indexer.ts)
- [Search native](../apps/desktop/electron/native/search.ts)
- [Vault search dialog](../apps/desktop/src/components/ui/vault-search-dialog.tsx)
- [Indexer tests](../apps/desktop/electron/native/index/indexer.test.ts)

## Properties and backlinks

- [Frontmatter](../apps/desktop/electron/native/markdown/frontmatter.ts)
- [Properties](../apps/desktop/electron/native/files/properties.ts)
- [Backlinks](../apps/desktop/electron/native/backlinks.ts)
- [Properties panel](../apps/desktop/src/features/properties/properties-panel.tsx)

## Application shell

- [Workspace top bar](../apps/desktop/src/components/shell/workspace-top-bar.tsx)
- [Activity rail](../apps/desktop/src/components/shell/activity-rail.tsx)
- [Router](../apps/desktop/src/app/router.tsx)
- [Router tests](../apps/desktop/src/app/router.test.ts)

## Settings and session

- [Settings native](../apps/desktop/electron/native/settings.ts)
- [Settings provider](../apps/desktop/src/features/settings/settings-provider.tsx)
- [Appearance settings](../apps/desktop/src/routes/settings/appearance.tsx)
- [Settings tests](../apps/desktop/electron/native/settings.test.ts)

## Commands and IPC

- [Command contract](../apps/desktop/src/lib/copper/command-contract.ts)
- [Command registry](../apps/desktop/src/app/commands/registry.ts)
- [Main handlers](../apps/desktop/electron/main/handlers.ts)
- [Invoke tests](../apps/desktop/src/lib/copper/invoke.test.ts)

## Git integration

- [Git host](../apps/desktop/electron/native/git/host.ts)
- [Git publish](../apps/desktop/electron/native/git/publish.ts)
- [Git status UI](../apps/desktop/src/features/git/git-status-control.tsx)
- [Git publish tests](../apps/desktop/electron/native/git/publish.test.ts)

## Desktop platform

- [Main entry](../apps/desktop/electron/main/index.ts)
- [Preload](../apps/desktop/electron/preload/index.ts)
- [Watcher](../apps/desktop/electron/main/watch.ts)
- [Updater](../apps/desktop/electron/main/updater.ts)
- [Security](../apps/desktop/electron/main/security.ts)
- [Updater tests](../apps/desktop/electron/main/updater.test.ts)

## Landing site

- [Landing index](../apps/landing/src/pages/index.astro)
- [Site metadata](../apps/landing/src/lib/site.ts)
- [Landing tests](../apps/landing/tests/site.test.mjs)

## Capability specs (baseline)

- [vault](specs/vault/spec.md)
- [notes-workspace](specs/notes-workspace/spec.md)
- [markdown-editor](specs/markdown-editor/spec.md)
- [tasks](specs/tasks/spec.md)
- [search-index](specs/search-index/spec.md)
- [properties-backlinks](specs/properties-backlinks/spec.md)
- [application-shell](specs/application-shell/spec.md)
- [settings-session](specs/settings-session/spec.md)
- [commands](specs/commands/spec.md)
- [git-integration](specs/git-integration/spec.md)
- [desktop-platform](specs/desktop-platform/spec.md)
- [landing-site](specs/landing-site/spec.md)
