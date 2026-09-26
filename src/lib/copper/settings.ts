import { copperInvoke } from "@/lib/copper/invoke";
import {
  DEFAULT_ISSUE_ID_PREFIX,
  type IssueColumnId,
  normalizeIssueColumnWidths,
  normalizeIssueIdPrefix,
  normalizeOrderedIds,
} from "@/lib/copper/task-settings";
import {
  type DarkThemeId,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  isDarkThemeId,
  isLightThemeId,
  type LightThemeId,
} from "@/lib/copper/themes";

export type NavigationLayout = "note-list" | "tree";

export interface CopperSettings {
  theme: "light" | "dark" | "system";
  lightTheme: LightThemeId;
  darkTheme: DarkThemeId;
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  wrapping: boolean;
  attachmentFolder: string;
  navigationLayout: NavigationLayout;
  issueIdPrefix: string;
}

export interface SessionTab {
  path: string;
  preview: boolean;
}

/** Inputs accepted while reading sessions written by older Copper versions. */
export type SessionTabInput =
  | string
  | {
      path: string;
      preview?: boolean;
    };

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

export type TasksTabTarget =
  | {
      kind: "destination";
      destination: Exclude<TasksDestination, "project">;
      view: TasksView;
    }
  | { kind: "project"; project: string; view: TasksProjectView }
  | { kind: "issue"; issue: string };

export interface TasksSessionTab {
  id: string;
  target: TasksTabTarget;
  back: TasksTabTarget[];
  forward: TasksTabTarget[];
  preview: boolean;
}

export type TasksSessionTabInput = Partial<TasksSessionTab> & {
  target?: unknown;
  back?: unknown;
  forward?: unknown;
};

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
  tasksTabs: TasksSessionTab[];
  activeTasksTabId: string | null;
  tasksProjectOrder: string[];
  tasksPinnedProjects: string[];
  tasksListColumnWidths: Partial<Record<IssueColumnId, number>>;
}

export interface UnnormalizedVaultSession {
  tabs?: readonly SessionTabInput[] | null;
  activePath?: string | null;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  favorites?: readonly string[] | null;
  workspaceMode?: WorkspaceMode | null;
  tasksView?: TasksView | null;
  tasksProject?: string | null;
  tasksDestination?: TasksDestination | null;
  tasksProjectView?: TasksProjectView | null;
  tasksTabs?: readonly TasksSessionTabInput[] | null;
  activeTasksTabId?: string | null;
  tasksProjectOrder?: readonly string[] | null;
  tasksPinnedProjects?: readonly string[] | null;
  tasksListColumnWidths?: Partial<Record<IssueColumnId, number>> | null;
}

export const defaultSettings: CopperSettings = {
  theme: "system",
  lightTheme: DEFAULT_LIGHT_THEME,
  darkTheme: DEFAULT_DARK_THEME,
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
  const merged = { ...defaultSettings, ...(settings ?? {}) };
  return {
    ...merged,
    lightTheme: isLightThemeId(settings?.lightTheme)
      ? settings.lightTheme
      : DEFAULT_LIGHT_THEME,
    darkTheme: isDarkThemeId(settings?.darkTheme)
      ? settings.darkTheme
      : DEFAULT_DARK_THEME,
    navigationLayout:
      settings?.navigationLayout === "tree" ? "tree" : "note-list",
    issueIdPrefix: normalizeIssueIdPrefix(settings?.issueIdPrefix),
  };
}

/**
 * Normalize persisted tabs without relying on their order for preview state.
 * Legacy string entries are pinned, duplicate paths collapse to one tab, and
 * the first preview wins when malformed data contains several previews.
 */
export function normalizeSessionTabs(
  tabs?: readonly SessionTabInput[] | null,
  availablePaths?: readonly string[],
): SessionTab[] {
  const available = availablePaths ? new Set(availablePaths) : undefined;
  const byPath = new Map<string, SessionTab>();

  for (const rawTab of tabs ?? []) {
    const tab =
      typeof rawTab === "string"
        ? { path: rawTab, preview: false }
        : rawTab && typeof rawTab.path === "string"
          ? { path: rawTab.path, preview: rawTab.preview === true }
          : undefined;
    if (!tab || tab.path.length === 0 || available?.has(tab.path) === false) {
      continue;
    }

    const existing = byPath.get(tab.path);
    if (!existing) {
      byPath.set(tab.path, tab);
    } else {
      // A duplicate pinned record must never be downgraded to preview.
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

export function normalizeVaultSession(
  session?: UnnormalizedVaultSession | null,
  availablePaths?: readonly string[],
): VaultSession {
  const tabs = normalizeSessionTabs(session?.tabs, availablePaths);
  const activePath =
    typeof session?.activePath === "string" &&
    tabs.some((tab) => tab.path === session.activePath)
      ? session.activePath
      : null;
  const available = availablePaths ? new Set(availablePaths) : undefined;
  const favorites = [...new Set(session?.favorites ?? [])].filter(
    (path) =>
      typeof path === "string" &&
      path.length > 0 &&
      (available ? available.has(path) : true),
  );
  const tasksProject =
    typeof session?.tasksProject === "string" && session.tasksProject.length > 0
      ? session.tasksProject
      : null;
  const tasksDestinations: TasksDestination[] = [
    "all",
    "active",
    "backlog",
    "completed",
    "projects",
    "project",
  ];
  const tasksProjectViews: TasksProjectView[] = ["overview", "issues", "board"];
  const tasksView: TasksView = session?.tasksView === "list" ? "list" : "board";
  const restoredDestination =
    session?.tasksDestination &&
    tasksDestinations.includes(session.tasksDestination)
      ? session.tasksDestination
      : tasksProject
        ? "project"
        : "all";
  const tasksDestination =
    restoredDestination === "active" ||
    restoredDestination === "backlog" ||
    restoredDestination === "completed"
      ? "all"
      : restoredDestination;
  const tasksProjectView =
    session?.tasksProjectView &&
    tasksProjectViews.includes(session.tasksProjectView)
      ? session.tasksProjectView
      : tasksView === "list"
        ? "issues"
        : "board";
  const fallbackTaskTarget: TasksTabTarget =
    tasksDestination === "project" && tasksProject
      ? { kind: "project", project: tasksProject, view: tasksProjectView }
      : {
          kind: "destination",
          destination:
            tasksDestination === "project" ? "all" : tasksDestination,
          view: tasksView,
        };
  const tasksTabs = normalizeTasksSessionTabs(
    session?.tasksTabs,
    fallbackTaskTarget,
  );
  const activeTasksTabId = tasksTabs.some(
    (tab) => tab.id === session?.activeTasksTabId,
  )
    ? (session?.activeTasksTabId ?? null)
    : (tasksTabs[0]?.id ?? null);

  return {
    tabs,
    activePath,
    leftCollapsed: session?.leftCollapsed ?? false,
    rightCollapsed: session?.rightCollapsed ?? false,
    favorites,
    workspaceMode: session?.workspaceMode === "tasks" ? "tasks" : "notes",
    tasksView,
    tasksProject,
    tasksDestination,
    tasksProjectView,
    tasksTabs,
    activeTasksTabId,
    tasksProjectOrder: normalizeOrderedIds(session?.tasksProjectOrder),
    tasksPinnedProjects: normalizeOrderedIds(session?.tasksPinnedProjects),
    tasksListColumnWidths: normalizeIssueColumnWidths(
      session?.tasksListColumnWidths,
    ),
  };
}

function normalizeTasksTabTarget(value: unknown): TasksTabTarget | undefined {
  if (!value || typeof value !== "object") return undefined;
  const target = value as Record<string, unknown>;
  if (
    target.kind === "issue" &&
    typeof target.issue === "string" &&
    target.issue.length > 0
  ) {
    return { kind: "issue", issue: target.issue };
  }
  if (
    target.kind === "project" &&
    typeof target.project === "string" &&
    target.project.length > 0 &&
    (target.view === "overview" ||
      target.view === "issues" ||
      target.view === "board")
  ) {
    return {
      kind: "project",
      project: target.project,
      view: target.view,
    };
  }
  if (
    target.kind === "destination" &&
    (target.destination === "all" ||
      target.destination === "active" ||
      target.destination === "backlog" ||
      target.destination === "completed" ||
      target.destination === "projects") &&
    (target.view === "list" || target.view === "board")
  ) {
    return {
      kind: "destination",
      destination:
        target.destination === "active" ||
        target.destination === "backlog" ||
        target.destination === "completed"
          ? "all"
          : target.destination,
      view: target.view,
    };
  }
  return undefined;
}

function normalizeTasksHistory(value: unknown): TasksTabTarget[] {
  return Array.isArray(value)
    ? value
        .map(normalizeTasksTabTarget)
        .filter((target): target is TasksTabTarget => Boolean(target))
        .slice(-50)
    : [];
}

export function normalizeTasksSessionTabs(
  tabs: readonly TasksSessionTabInput[] | null | undefined,
  fallback: TasksTabTarget = {
    kind: "destination",
    destination: "all",
    view: "board",
  },
): TasksSessionTab[] {
  const normalized: TasksSessionTab[] = [];
  const ids = new Set<string>();
  let previewSeen = false;
  for (const raw of tabs ?? []) {
    const target = normalizeTasksTabTarget(raw?.target);
    if (!target || typeof raw?.id !== "string" || !raw.id || ids.has(raw.id)) {
      continue;
    }
    ids.add(raw.id);
    const preview = raw.preview === true && !previewSeen;
    if (preview) previewSeen = true;
    normalized.push({
      id: raw.id,
      target,
      back: normalizeTasksHistory(raw.back),
      forward: normalizeTasksHistory(raw.forward),
      preview,
    });
  }
  return normalized.length
    ? normalized
    : [
        {
          id: "tasks-home",
          target: fallback,
          back: [],
          forward: [],
          preview: false,
        },
      ];
}

export function load(): Promise<CopperSettings> {
  return copperInvoke<Partial<CopperSettings>>("load_settings").then(
    normalizeSettings,
  );
}

export function save(settings: CopperSettings): Promise<void> {
  return copperInvoke<void>("save_settings", {
    settings: normalizeSettings(settings),
  });
}

export function loadSession(vaultId: string): Promise<VaultSession> {
  return copperInvoke<UnnormalizedVaultSession>("load_session", {
    vaultId,
  }).then(normalizeVaultSession);
}

export function saveSession(
  vaultId: string,
  session: VaultSession | UnnormalizedVaultSession,
): Promise<void> {
  return copperInvoke<void>("save_session", {
    vaultId,
    session: normalizeVaultSession(session),
  });
}
