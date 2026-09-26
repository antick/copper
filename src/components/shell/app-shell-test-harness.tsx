import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell, uniqueNotePath } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/features/settings/settings-provider";
import type { GitStatus } from "@/lib/copper/git";

export function uniqueNotePathForTest(
  existing: ReadonlySet<string>,
  parent?: string,
) {
  return uniqueNotePath(existing, parent);
}

const mocks = vi.hoisted(() => ({
  navigationLayout: "note-list" as "note-list" | "tree",
  emptyTree: false,
  gitStatus: { kind: "not_git" } as GitStatus,
  createFile: vi.fn(async () => undefined),
  createFolder: vi.fn(async (path: string) => path),
  saveFile: vi.fn(async () => "revision"),
  loadSession: vi.fn(
    async (): Promise<Record<string, unknown>> => ({
      tabs: [],
      activePath: null,
      leftCollapsed: false,
      rightCollapsed: false,
      favorites: [],
      tasksProjectOrder: [],
      tasksPinnedProjects: [],
      tasksListColumnWidths: {},
    }),
  ),
  saveSession: vi.fn(async () => undefined),
  archiveFile: vi.fn(
    async (_vaultId: string, path: string) => `Archive/${path}`,
  ),
  restoreFile: vi.fn(async (_vaultId: string, path: string) =>
    path.replace(/^Archive\//, ""),
  ),
  trashFile: vi.fn(async () => undefined),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/lib/copper", () => ({
  copper: {
    system: {
      appInfo: async () => ({
        name: "Copper",
        version: "0.1.0",
        platform: "macos",
      }),
    },
    vaults: {
      list: async () => [{ id: "demo", name: "Demo", path: "/tmp/demo" }],
    },
    files: {
      tree: async () => ({
        name: "Demo Vault",
        path: "",
        kind: "directory",
        children: mocks.emptyTree
          ? []
          : [
              {
                name: "Inbox",
                path: "Inbox",
                kind: "directory",
                children: [
                  {
                    name: "quick-thought.md",
                    path: "Inbox/quick-thought.md",
                    kind: "file",
                    fileKind: "markdown",
                    typeLabel: "MD",
                  },
                ],
              },
              {
                name: "Projects",
                path: "Projects",
                kind: "directory",
                children: [
                  {
                    name: "architecture.md",
                    path: "Projects/architecture.md",
                    kind: "file",
                    fileKind: "markdown",
                    typeLabel: "MD",
                  },
                ],
              },
              {
                name: "root-note.md",
                path: "root-note.md",
                kind: "file",
                fileKind: "markdown",
                typeLabel: "MD",
              },
              {
                name: "app.ts",
                path: "app.ts",
                kind: "file",
                fileKind: "code",
                typeLabel: "TS",
              },
              {
                name: "photo.png",
                path: "photo.png",
                kind: "file",
                fileKind: "image",
                typeLabel: "PNG",
              },
            ],
      }),
      createFile: mocks.createFile,
      createFolder: mocks.createFolder,
      rename: async (_vaultId: string, _from: string, to: string) => to,
      archive: mocks.archiveFile,
      restore: mocks.restoreFile,
      trash: mocks.trashFile,
      binaryMetadata: async () => ({ mimeType: "image/png", size: 8 }),
      readBinary: async () => new Uint8Array(8),
      read: async () => ["# Note\n", "revision"],
      save: mocks.saveFile,
    },
    search: {
      indexVault: async () => 0,
      notes: async (_vaultId: string, scope: string) => {
        const rows = [
          {
            path: "Inbox/copper.md",
            title: "Copper MVP",
            snippet: "A fast, beautiful, local-first Markdown editor.",
            tags: ["product"],
            mtimeNs: 2,
          },
          {
            path: "Projects/architecture.md",
            title: "Architecture",
            snippet: "Desktop shell notes.",
            tags: ["engineering"],
            mtimeNs: 1,
          },
          {
            path: "Tasks/Issues/COPP-1-board.md",
            title: "Fast board",
            snippet: "Ship the kanban board.",
            tags: ["ui"],
            mtimeNs: 3,
          },
        ];
        if (scope === "all") return rows;
        return rows.filter(
          (note) => note.path === scope || note.path.startsWith(`${scope}/`),
        );
      },
      query: async () => [],
      indexFile: async () => undefined,
      removeIndexed: async () => undefined,
    },
    settings: {
      load: async () => ({
        theme: "system",
        fontSize: 14,
        lineHeight: 1.55,
        tabSize: 2,
        wrapping: true,
        attachmentFolder: "attachments",
        navigationLayout: mocks.navigationLayout,
      }),
      save: async (settings: { navigationLayout: "note-list" | "tree" }) => {
        mocks.navigationLayout = settings.navigationLayout;
      },
      loadSession: mocks.loadSession,
      saveSession: mocks.saveSession,
    },
    git: {
      status: async () => mocks.gitStatus,
      diff: async () => ({ path: "a.md", text: "", binary: false }),
      publish: async () => ({
        kind: "error",
        reason: "not_git",
        changedPaths: [],
        siblingPaths: [],
      }),
    },
    events: {
      listenToVaultEvents: async () => () => undefined,
    },
    properties: {
      read: async () => ({ raw: "", body: "", values: {} }),
      update: async () => undefined,
    },
    backlinks: {
      list: async () => [],
    },
    tasks: {
      listIssues: async () => [
        {
          path: "Tasks/Issues/COPP-1-board.md",
          id: "COPP-1",
          title: "Fast board",
          status: "todo",
          priority: "high",
          project: "copper",
          labels: ["ui"],
          due: null,
          rank: "A",
          created: "",
          updated: "",
        },
      ],
      listProjects: async () => [
        {
          path: "Tasks/Projects/copper.md",
          id: "copper",
          title: "Copper",
          status: "started",
          labels: [],
          start: null,
          target: null,
          counts: {
            backlog: 0,
            todo: 1,
            in_progress: 0,
            done: 0,
            canceled: 0,
          },
        },
      ],
      getIssue: async () => ({
        path: "Tasks/Issues/COPP-1-board.md",
        id: "COPP-1",
        title: "Fast board",
        status: "todo",
        priority: "high",
        project: "copper",
        labels: ["ui"],
        due: null,
        rank: "A",
        created: "",
        updated: "",
        body: "# Fast board\n",
      }),
      getProject: async () => ({
        path: "Tasks/Projects/copper.md",
        id: "copper",
        title: "Copper",
        status: "started",
        labels: [],
        start: null,
        target: null,
        counts: {
          backlog: 0,
          todo: 1,
          in_progress: 0,
          done: 0,
          canceled: 0,
        },
        body: "# Copper\n",
      }),
      createIssue: async () => undefined,
      updateIssue: async () => undefined,
      moveIssue: async () => undefined,
      createProject: async () => undefined,
      updateProject: async () => undefined,
    },
  },
}));

export function getAppShellMocks() {
  return mocks;
}

export function renderShell({ realEditor = false } = {}) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1280,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SettingsProvider>
          <AppShell vaultId="demo" vaultName="Demo Vault">
            {realEditor ? undefined : <div>Editor body</div>}
          </AppShell>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

export function resetAppShellMocks() {
  mocks.navigationLayout = "note-list";
  mocks.emptyTree = false;
  mocks.gitStatus = { kind: "not_git" };
  mocks.createFile.mockClear();
  mocks.createFolder.mockClear();
  mocks.saveFile.mockClear();
  mocks.loadSession.mockClear();
  mocks.saveSession.mockClear();
  mocks.archiveFile.mockClear();
  mocks.restoreFile.mockClear();
  mocks.trashFile.mockClear();
}
