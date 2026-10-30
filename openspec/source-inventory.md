# Source inventory

Maps each OpenSpec capability to primary source files. Use this list to trace baseline requirements to code.

## vault

- `apps/desktop/electron/native/vaults.ts`
- `apps/desktop/electron/native/path.ts`
- `apps/desktop/src/lib/copper/vaults.ts`
- `apps/desktop/src/features/vault/queries.ts`
- `apps/desktop/src/routes/vault/$vaultId.tsx`
- `apps/desktop/src/routes/welcome.tsx`
- `apps/desktop/src/features/welcome/welcome-screen.tsx`
- `apps/desktop/src/routes/index.tsx`

## notes-workspace

- `apps/desktop/src/components/shell/app-shell.tsx`
- `apps/desktop/src/components/shell/notes-workspace.tsx`
- `apps/desktop/src/components/shell/left-sidebar.tsx`
- `apps/desktop/src/components/shell/note-list-pane.tsx`
- `apps/desktop/src/components/shell/editor-pane.tsx`
- `apps/desktop/src/features/file-tree/file-tree.tsx`
- `apps/desktop/src/features/file-tree/mutations.ts`
- `apps/desktop/src/features/tabs/session-reducer.ts`
- `apps/desktop/src/features/tabs/tab-strip.tsx`

## markdown-editor

- `apps/desktop/src/features/editor/copper-editor.tsx`
- `apps/desktop/src/features/editor/use-document-save.ts`
- `apps/desktop/src/features/editor/document-save-queue.ts`
- `apps/desktop/src/features/editor/extensions/live-preview.ts`
- `apps/desktop/src/features/editor/extensions/drop-files.ts`
- `apps/desktop/shared/document-save.ts`
- `apps/desktop/electron/native/files/service.ts`
- `apps/desktop/electron/native/atomic-write.ts`

## tasks

- `apps/desktop/shared/task-paths.ts`
- `apps/desktop/electron/native/tasks/service.ts`
- `apps/desktop/electron/native/tasks/project-service.ts`
- `apps/desktop/electron/native/tasks/ids.ts`
- `apps/desktop/src/features/tasks/tasks-workspace.tsx`
- `apps/desktop/src/features/tasks/issue-board.tsx`
- `apps/desktop/src/features/tasks/issue-list.tsx`
- `apps/desktop/src/lib/copper/tasks.ts`

## search-index

- `apps/desktop/electron/native/index/schema.ts`
- `apps/desktop/electron/native/index/db.ts`
- `apps/desktop/electron/native/index/indexer.ts`
- `apps/desktop/electron/native/search.ts`
- `apps/desktop/src/lib/copper/search.ts`
- `apps/desktop/src/components/ui/vault-search-dialog.tsx`

## properties-backlinks

- `apps/desktop/electron/native/markdown/frontmatter.ts`
- `apps/desktop/electron/native/files/properties.ts`
- `apps/desktop/electron/native/backlinks.ts`
- `apps/desktop/electron/native/markdown/links.ts`
- `apps/desktop/src/features/properties/properties-panel.tsx`
- `apps/desktop/src/features/backlinks/backlinks-section.tsx`

## application-shell

- `apps/desktop/src/components/shell/workspace-top-bar.tsx`
- `apps/desktop/src/components/shell/activity-rail.tsx`
- `apps/desktop/src/components/shell/status-bar.tsx`
- `apps/desktop/src/app/router.tsx`
- `apps/desktop/src/routes/__root.tsx`

## settings-session

- `apps/desktop/electron/native/settings.ts`
- `apps/desktop/src/lib/copper/settings.ts`
- `apps/desktop/src/features/settings/settings-provider.tsx`
- `apps/desktop/src/routes/settings/appearance.tsx`
- `apps/desktop/src/routes/settings/editor.tsx`
- `apps/desktop/src/routes/settings/files.tsx`

## commands

- `apps/desktop/src/app/commands/registry.ts`
- `apps/desktop/src/components/ui/command-menu.tsx`
- `apps/desktop/src/components/shell/use-app-shell-commands.ts`
- `apps/desktop/src/features/tasks/task-workspace-shortcuts.ts`
- `apps/desktop/src/lib/copper/command-contract.ts`

## git-integration

- `apps/desktop/electron/native/git/host.ts`
- `apps/desktop/electron/native/git/publish.ts`
- `apps/desktop/src/lib/copper/git.ts`
- `apps/desktop/src/features/git/git-status-control.tsx`
- `apps/desktop/src/features/git/git-diff-view.tsx`

## desktop-platform

- `apps/desktop/electron/main/index.ts`
- `apps/desktop/electron/main/handlers.ts`
- `apps/desktop/electron/preload/index.ts`
- `apps/desktop/electron/main/watch.ts`
- `apps/desktop/electron/main/security.ts`
- `apps/desktop/electron/main/updater.ts`
- `apps/desktop/electron/main/identity.ts`

## landing-site

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/Hero.astro`
- `apps/landing/src/components/Tasks.astro`
- `apps/landing/src/pages/sitemap.xml.ts`
- `apps/landing/tests/site.test.mjs`
- `apps/landing/astro.config.mjs`

## IPC contract (cross-cutting)

- `apps/desktop/src/lib/copper/command-contract.ts`
- `apps/desktop/electron/main/handlers.ts`
- `apps/desktop/src/lib/copper/invoke.ts`
