import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ISSUE_ID_PREFIX,
  type IssueColumnId,
  normalizeIssueColumnWidths,
  normalizeIssueIdPrefix,
  normalizeOrderedIds,
} from "../../src/lib/copper/task-settings";
import { DARK_THEME_IDS, LIGHT_THEME_IDS } from "../../src/lib/copper/themes";

const LIGHT_THEMES = new Set<string>(LIGHT_THEME_IDS);
const DARK_THEMES = new Set<string>(DARK_THEME_IDS);

export interface CopperSettings {
  theme: string;
  lightTheme: string;
  darkTheme: string;
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  wrapping: boolean;
  attachmentFolder: string;
  navigationLayout: string;
  issueIdPrefix: string;
}

export interface SessionTab {
  path: string;
  preview: boolean;
}

export type WorkspaceMode = "notes" | "tasks";
export type TasksView = "list" | "board";
export type TasksDestination =
  | "all"
  | "active"
  | "backlog"
  | "completed"
  | "projects"
  | "project";
export type TasksProjectView = "overview" | "issues" | "board";

export interface VaultSession {
  tabs: SessionTab[];
  activePath: string | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  favorites: string[];
  workspaceMode: WorkspaceMode;
  tasksView: TasksView;
  tasksProject: string | null;
  tasksDestination: TasksDestination;
  tasksProjectView: TasksProjectView;
  tasksTabs: unknown[];
  activeTasksTabId: string | null;
  tasksProjectOrder: string[];
  tasksPinnedProjects: string[];
  tasksListColumnWidths: Partial<Record<IssueColumnId, number>>;
}

export const defaultSettings: CopperSettings = {
  theme: "system",
  lightTheme: "linen",
  darkTheme: "graphite",
  fontSize: 14,
  lineHeight: 1.55,
  tabSize: 2,
  wrapping: true,
  attachmentFolder: "attachments",
  navigationLayout: "note-list",
  issueIdPrefix: DEFAULT_ISSUE_ID_PREFIX,
};

export function normalizeSettings(
  settings?: Partial<CopperSettings> | null,
): CopperSettings {
  const { windowTransparency: _legacy, ...current } = (settings ??
    {}) as Partial<CopperSettings> & { windowTransparency?: unknown };
  const merged = { ...defaultSettings, ...current };
  return {
    ...merged,
    lightTheme: LIGHT_THEMES.has(merged.lightTheme)
      ? merged.lightTheme
      : defaultSettings.lightTheme,
    darkTheme: DARK_THEMES.has(merged.darkTheme)
      ? merged.darkTheme
      : defaultSettings.darkTheme,
    navigationLayout: merged.navigationLayout === "tree" ? "tree" : "note-list",
    issueIdPrefix: normalizeIssueIdPrefix(merged.issueIdPrefix),
  };
}

function normalizeTabs(tabs: unknown): SessionTab[] {
  const byPath = new Map<string, SessionTab>();
  const list = Array.isArray(tabs) ? tabs : [];
  for (const raw of list) {
    const tab =
      typeof raw === "string"
        ? { path: raw, preview: false }
        : raw && typeof raw === "object" && "path" in raw
          ? {
              path: String((raw as { path: string }).path),
              preview: (raw as { preview?: boolean }).preview === true,
            }
          : undefined;
    if (!tab?.path) continue;
    const existing = byPath.get(tab.path);
    if (!existing) {
      byPath.set(tab.path, tab);
    } else {
      existing.preview = existing.preview && tab.preview;
    }
  }
  let previewSeen = false;
  return [...byPath.values()].map((tab) => {
    if (!tab.preview || !previewSeen) {
      if (tab.preview) previewSeen = true;
      return tab;
    }
    return { ...tab, preview: false };
  });
}

export function normalizeSession(
  raw?: Partial<VaultSession> | null,
): VaultSession {
  const tabs = normalizeTabs(raw?.tabs);
  const favorites = [...new Set(raw?.favorites ?? [])].filter(
    (item) => typeof item === "string" && item.length > 0,
  );
  const activePath =
    typeof raw?.activePath === "string" &&
    tabs.some((tab) => tab.path === raw.activePath)
      ? raw.activePath
      : null;
  const tasksProject =
    typeof raw?.tasksProject === "string" && raw.tasksProject.length > 0
      ? raw.tasksProject
      : null;
  const destinations: TasksDestination[] = [
    "all",
    "active",
    "backlog",
    "completed",
    "projects",
    "project",
  ];
  const projectViews: TasksProjectView[] = ["overview", "issues", "board"];
  const restoredDestination =
    raw?.tasksDestination && destinations.includes(raw.tasksDestination)
      ? raw.tasksDestination
      : tasksProject
        ? "project"
        : "all";
  return {
    tabs,
    activePath,
    leftCollapsed: raw?.leftCollapsed ?? false,
    rightCollapsed: raw?.rightCollapsed ?? false,
    favorites,
    workspaceMode: raw?.workspaceMode === "tasks" ? "tasks" : "notes",
    tasksView: raw?.tasksView === "list" ? "list" : "board",
    tasksProject,
    tasksDestination:
      restoredDestination === "active" ||
      restoredDestination === "backlog" ||
      restoredDestination === "completed"
        ? "all"
        : restoredDestination,
    tasksProjectView:
      raw?.tasksProjectView && projectViews.includes(raw.tasksProjectView)
        ? raw.tasksProjectView
        : raw?.tasksView === "list"
          ? "issues"
          : "board",
    tasksTabs: Array.isArray(raw?.tasksTabs) ? raw.tasksTabs : [],
    activeTasksTabId:
      typeof raw?.activeTasksTabId === "string" ? raw.activeTasksTabId : null,
    tasksProjectOrder: normalizeOrderedIds(raw?.tasksProjectOrder),
    tasksPinnedProjects: normalizeOrderedIds(raw?.tasksPinnedProjects),
    tasksListColumnWidths: normalizeIssueColumnWidths(
      raw?.tasksListColumnWidths,
    ),
  };
}

export function settingsPath(configDir: string): string {
  return path.join(configDir, "settings.json");
}

export function sessionPath(dataDir: string, vaultId: string): string {
  return path.join(dataDir, "vaults", vaultId, "session.json");
}

export function loadSettings(configDir: string): CopperSettings {
  const file = settingsPath(configDir);
  if (!fs.existsSync(file)) {
    return { ...defaultSettings };
  }
  try {
    return normalizeSettings(
      JSON.parse(fs.readFileSync(file, "utf8")) as Partial<CopperSettings>,
    );
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(
  configDir: string,
  settings: Partial<CopperSettings>,
): void {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    settingsPath(configDir),
    JSON.stringify(normalizeSettings(settings), null, 2),
  );
}

export function loadSession(dataDir: string, vaultId: string): VaultSession {
  const file = sessionPath(dataDir, vaultId);
  if (!fs.existsSync(file)) {
    return normalizeSession();
  }
  try {
    return normalizeSession(
      JSON.parse(fs.readFileSync(file, "utf8")) as Partial<VaultSession>,
    );
  } catch {
    return normalizeSession();
  }
}

export function saveSession(
  dataDir: string,
  vaultId: string,
  session: Partial<VaultSession>,
): void {
  const file = sessionPath(dataDir, vaultId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(normalizeSession(session), null, 2));
}
