import { DEFAULT_ISSUE_ID_PREFIX } from "@/lib/copper/task-settings";
import {
  parsePreviewFrontmatter,
  serializePreviewFrontmatter,
} from "@/preview/preview-markdown";
import {
  dispatchPreviewTask,
  PREVIEW_TASK_UNHANDLED,
} from "@/preview/preview-task-service";
import { PREVIEW_VAULT_TREE } from "@/preview/preview-vault-tree";

const DEMO_ID = "demo-vault";
const DEMO_PATH = "~/Documents/Notes";
const hour = 3_600_000_000_000;

const COPPER_MD = `---
title: Copper
type: essay
status: evergreen
date: 2026-08-16
tags:
  - product
  - research
---

# Copper

A local-first workspace for notes, tasks, and projects.

Markdown files in this folder are the source of truth. See [[Architecture]] and #research.

- [x] Open a Vault
- [ ] Write notes
- [ ] Plan the next step in Tasks
`;

const ARCHITECTURE_MD = `---
title: Architecture
type: reference
status: active
tags:
  - research
---

# Architecture

Copper uses **Electron**, a Node.js core, and CodeMirror 6.

## Principles

- Markdown files are canonical.
- SQLite is a disposable index.
- The editor stays responsive.
`;

const QUICK_THOUGHT_MD = `# Quick thought

Capture a spark before it disappears. Inbox is for unsorted notes.
`;

const DAILY_MD = `---
type: journal
status: active
---

# Daily

What moved today, what is blocked, and what to write tomorrow.
`;

const OUTLINE_MD = `# Outline

- Problem
- Product direction
- Performance proof
`;

const previewFiles = new Map<string, string>([
  ["Inbox/copper.md", COPPER_MD],
  ["Inbox/quick-thought.md", QUICK_THOUGHT_MD],
  ["Inbox/daily.md", DAILY_MD],
  ["Projects/Copper/architecture.md", ARCHITECTURE_MD],
  ["Projects/Copper/drafts/outline.md", OUTLINE_MD],
  ["Projects/Copper/app.ts", "export const copper = true;\n"],
  ["Projects/Copper/config.json", '{\n  "theme": "linen"\n}\n'],
  ["README", "Copper demo Vault\n"],
  ["Archive/Projects/retired.md", "# Retired\n\nAn archived note.\n"],
  [
    "Tasks/Projects/copper.md",
    `---
type: project
id: copper
status: started
labels:
  - app
---

# Copper

Local-first workspace.
`,
  ],
  [
    "Tasks/Issues/DEMO-1-fast-board.md",
    `---
type: issue
id: DEMO-1
status: todo
priority: high
project: copper
labels:
  - ui
rank: A
created: 2026-08-29T00:00:00.000Z
updated: 2026-08-29T00:00:00.000Z
---

# Fast board

Ship the kanban board.
`,
  ],
  [
    "Tasks/Issues/DEMO-2-projects.md",
    `---
type: issue
id: DEMO-2
status: in_progress
priority: medium
project: copper
labels:
  - ui
rank: B
created: 2026-08-29T00:00:00.000Z
updated: 2026-08-29T00:00:00.000Z
---

# Project list

Scope issues by project.
`,
  ],
]);

const previewBinaryFiles = new Map<string, Uint8Array>([
  [
    "assets/copper.png",
    Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      ),
      (character) => character.charCodeAt(0),
    ),
  ],
]);

let previewSession = {
  tabs: [{ path: "Inbox/copper.md", preview: false }],
  activePath: "Inbox/copper.md" as string | null,
  leftCollapsed: false,
  rightCollapsed: false,
  favorites: ["Inbox/copper.md", "Inbox/daily.md"],
  workspaceMode: "notes" as "notes" | "tasks",
  tasksView: "board" as "list" | "board",
  tasksProject: null as string | null,
  tasksDestination: "all" as const,
  tasksProjectView: "board" as const,
};

let previewSettings = {
  theme: "light",
  lightTheme: "linen" as const,
  darkTheme: "graphite" as const,
  fontSize: 15,
  lineHeight: 1.65,
  tabSize: 2,
  wrapping: true,
  attachmentFolder: "attachments",
  navigationLayout: "note-list" as const,
  issueIdPrefix: DEFAULT_ISSUE_ID_PREFIX,
};

let NOTES = [
  {
    path: "Inbox/copper.md",
    title: "Copper",
    snippet:
      "A local-first workspace for notes, tasks, and projects. Markdown files in this folder are the source of truth.",
    tags: ["product", "research"],
    mtimeNs: Date.now() * 1_000_000,
  },
  {
    path: "Inbox/quick-thought.md",
    title: "Quick thought",
    snippet:
      "Capture a spark before it disappears. Inbox is for unsorted notes.",
    tags: ["inbox"],
    mtimeNs: Date.now() * 1_000_000 - 4 * hour,
  },
  {
    path: "Inbox/daily.md",
    title: "Daily",
    snippet: "What moved today, what is blocked, and what to write tomorrow.",
    tags: ["journal"],
    mtimeNs: Date.now() * 1_000_000 - 22 * hour,
  },
  {
    path: "Projects/Copper/architecture.md",
    title: "Architecture",
    snippet: "Copper uses Electron, a Node.js core, and CodeMirror 6.",
    tags: ["research"],
    mtimeNs: Date.now() * 1_000_000 - 2 * hour,
  },
  {
    path: "Projects/Copper/drafts/outline.md",
    title: "Outline",
    snippet: "Problem, product direction, and performance proof.",
    tags: ["product"],
    mtimeNs: Date.now() * 1_000_000 - 8 * hour,
  },
  {
    path: "Archive/Projects/retired.md",
    title: "Retired",
    snippet: "An archived note.",
    tags: [],
    mtimeNs: Date.now() * 1_000_000 - 30 * hour,
  },
  {
    path: "Tasks/Projects/copper.md",
    title: "Copper",
    snippet: "Local-first workspace.",
    tags: ["app"],
    mtimeNs: Date.now() * 1_000_000 - 1 * hour,
  },
  {
    path: "Tasks/Issues/DEMO-1-fast-board.md",
    title: "Fast board",
    snippet: "Ship the kanban board.",
    tags: ["ui"],
    mtimeNs: Date.now() * 1_000_000 - 3 * hour,
  },
  {
    path: "Tasks/Issues/DEMO-2-projects.md",
    title: "Project list",
    snippet: "Scope issues by project.",
    tags: ["ui"],
    mtimeNs: Date.now() * 1_000_000 - 5 * hour,
  },
];

function notesFor(folder: unknown) {
  const scope = typeof folder === "string" ? folder : "all";
  if (!scope || scope === "all") {
    return NOTES.filter((note) => !note.path.startsWith("Archive/"));
  }
  if (scope === "Archive") {
    return NOTES.filter((note) => note.path.startsWith("Archive/"));
  }
  return NOTES.filter(
    (note) =>
      !note.path.startsWith("Archive/") &&
      (note.path === scope || note.path.startsWith(`${scope}/`)),
  );
}

const frontmatterFor = (path: string) =>
  parsePreviewFrontmatter(previewFiles, path);

function noteFromFile(path: string) {
  const content = previewFiles.get(path) ?? "";
  const title =
    /^#\s+(.+)$/m.exec(content)?.[1] ??
    path.split("/").at(-1)?.replace(/\.md$/i, "") ??
    path;
  const body = content
    .replace(/^---[\s\S]*?---\n?/, "")
    .replace(/^#+\s+/gm, "")
    .trim();
  return {
    path,
    title,
    snippet: body.slice(0, 120),
    tags: (frontmatterFor(path).values.tags as string[] | undefined) ?? [],
    mtimeNs: Date.now() * 1_000_000,
  };
}

function dispatch(cmd: string, args?: Record<string, unknown>) {
  const payload = (args ?? {}) as Record<string, unknown>;
  const taskResult = dispatchPreviewTask(
    cmd,
    payload,
    previewFiles,
    previewSettings.issueIdPrefix,
  );
  if (taskResult !== PREVIEW_TASK_UNHANDLED) return taskResult;
  switch (cmd) {
    case "app_info":
      return { name: "Copper", version: "0.2.0", platform: "macos" };
    case "pick_vault_folder":
      return DEMO_PATH;
    case "list_recent_vaults":
      if (new URLSearchParams(window.location.search).has("empty")) {
        return [];
      }
      return [{ id: DEMO_ID, name: "demo-vault", path: DEMO_PATH }];
    case "open_vault":
      return { id: DEMO_ID, name: "demo-vault", path: DEMO_PATH };
    case "close_vault":
      return null;
    case "load_settings":
      return previewSettings;
    case "save_settings":
      previewSettings = payload.settings as typeof previewSettings;
      return null;
    case "save_session":
      previewSession = payload.session as typeof previewSession;
      return null;
    case "load_session":
      return previewSession;
    case "index_open_vault":
    case "rebuild_vault_index":
      return NOTES.length;
    case "index_file_path": {
      const path = String(payload.path ?? "");
      NOTES = NOTES.filter((item) => item.path !== path);
      if (/\.(md|markdown)$/i.test(path) && previewFiles.has(path)) {
        NOTES = [...NOTES, noteFromFile(path)];
      }
      return null;
    }
    case "remove_indexed_file":
      NOTES = NOTES.filter((item) => item.path !== payload.path);
      return null;
    case "vault_tree":
      return PREVIEW_VAULT_TREE;
    case "list_notes":
      return notesFor(payload.folder);
    case "search_vault": {
      const query = String(payload.query ?? "").toLowerCase();
      const archiveOnly = payload.folder === "Archive";
      return NOTES.filter(
        (note) =>
          (archiveOnly
            ? note.path.startsWith("Archive/")
            : !note.path.startsWith("Archive/")) &&
          [note.title, note.snippet, note.path, ...note.tags]
            .join(" ")
            .toLowerCase()
            .includes(query),
      );
    }
    case "create_folder":
      return String(payload.path ?? "");
    case "create_file": {
      const path = String(payload.path ?? "");
      if (previewFiles.has(path))
        throw new Error("A note already exists there");
      previewFiles.set(path, String(payload.contents ?? ""));
      return path;
    }
    case "save_file": {
      const path = String(payload.path ?? "");
      const contents = String(payload.contents ?? "");
      previewFiles.set(path, contents);
      return {
        path,
        size: contents.length,
        mtimeNs: Date.now() * 1_000_000,
        hash: "preview",
      };
    }
    case "trash_path": {
      const path = String(payload.path ?? "");
      previewFiles.delete(path);
      previewBinaryFiles.delete(path);
      NOTES = NOTES.filter(
        (item) => item.path !== path && !item.path.startsWith(`${path}/`),
      );
      return null;
    }
    case "archive_file":
    case "restore_file": {
      const from = String(payload.path ?? "");
      const to =
        cmd === "archive_file"
          ? `Archive/${from}`
          : from.replace(/^Archive\//, "");
      const contents = previewFiles.get(from);
      if (contents == null || previewFiles.has(to)) {
        throw new Error("Archive destination is unavailable");
      }
      previewFiles.delete(from);
      previewFiles.set(to, contents);
      NOTES = NOTES.map((note) =>
        note.path === from ? { ...note, path: to } : note,
      );
      return to;
    }
    case "rename_path": {
      const from = String(payload.from ?? "");
      const to = String(payload.to ?? "");
      const contents = previewFiles.get(from);
      if (contents == null) throw new Error("The note no longer exists");
      previewFiles.delete(from);
      previewFiles.set(to, contents);
      NOTES = NOTES.map((note) =>
        note.path === from ? { ...note, path: to } : note,
      );
      return to;
    }
    case "binary_file_metadata": {
      const path = String(payload.path ?? "");
      const bytes = previewBinaryFiles.get(path);
      if (!bytes) throw new Error("The image no longer exists");
      return { mimeType: "image/png", size: bytes.length };
    }
    case "read_binary_file": {
      const path = String(payload.path ?? "");
      const bytes = previewBinaryFiles.get(path);
      if (!bytes) throw new Error("The image no longer exists");
      return bytes;
    }
    case "read_file": {
      const path = String(payload.path ?? "");
      const contents = previewFiles.get(path);
      if (contents == null) throw new Error("The file no longer exists");
      return [
        contents,
        {
          path,
          size: contents.length,
          mtimeNs: 0,
          hash: "preview",
        },
      ];
    }
    case "read_properties":
      return frontmatterFor(String(payload.path ?? ""));
    case "update_properties": {
      const path = String(payload.path ?? "");
      const properties = payload.properties as {
        body: string;
        values: Record<string, unknown>;
      };
      previewFiles.set(
        path,
        `---\n${serializePreviewFrontmatter(properties.values)}\n---\n${properties.body}`,
      );
      return null;
    }
    case "git_status":
      return { kind: "not_git" };
    case "git_diff":
      return { path: String(payload.path ?? ""), text: "", binary: false };
    case "git_publish":
      return {
        kind: "error",
        reason: "not_git",
        changedPaths: [],
        siblingPaths: [],
      };
    case "list_backlinks":
      return [
        { sourcePath: "Inbox/quick-thought.md", targetRaw: "Copper" },
        {
          sourcePath: "Projects/Copper/architecture.md",
          targetRaw: "Copper",
        },
      ];
    default:
      return null;
  }
}

window.copperDesktop = {
  packaged: false,
  invoke: async (command, args) => dispatch(command, args) as never,
  on: () => () => undefined,
};
