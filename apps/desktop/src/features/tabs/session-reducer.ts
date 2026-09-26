import {
  normalizeSessionTabs,
  type SessionTab,
  type SessionTabInput,
} from "@/lib/copper/settings";

export type EditorTab = SessionTab;
export type { SessionTabInput };

export interface SessionState {
  tabs: EditorTab[];
  activePath?: string;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  favorites: string[];
}

export interface RestorableSession {
  tabs?: readonly SessionTabInput[] | null;
  activePath?: string | null;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  favorites?: readonly string[] | null;
}

export type SessionAction =
  | { type: "open"; path: string }
  | { type: "open-preview"; path: string }
  | { type: "open-pinned"; path: string }
  | { type: "pin"; path: string }
  | { type: "activate"; path: string }
  | { type: "close"; path: string }
  | { type: "reorder"; from: number; to: number }
  | {
      type: "restore";
      session: RestorableSession;
      availablePaths?: readonly string[];
      validPaths?: readonly string[];
    }
  | { type: "rename"; from: string; to: string }
  | { type: "remove"; path: string }
  | { type: "toggle-left" }
  | { type: "toggle-right" }
  | { type: "set-left"; value: boolean }
  | { type: "set-right"; value: boolean }
  | { type: "toggle-favorite"; path: string };

export const emptySession: SessionState = {
  tabs: [],
  activePath: undefined,
  leftCollapsed: false,
  rightCollapsed: false,
  favorites: [],
};

function normalizeFavorites(paths: readonly string[] | null | undefined) {
  return [
    ...new Set(
      (paths ?? []).filter(
        (path): path is string => typeof path === "string" && path.length > 0,
      ),
    ),
  ];
}

function pathIsOpen(tabs: readonly EditorTab[], path: string | undefined) {
  return path != null && tabs.some((tab) => tab.path === path);
}

/** Normalize a restored session and optionally discard paths absent from a vault tree. */
export function normalizeSession(
  session?: RestorableSession | null,
  availablePaths?: readonly string[],
): SessionState {
  const tabs = normalizeSessionTabs(session?.tabs, availablePaths);
  const activePath = pathIsOpen(tabs, session?.activePath ?? undefined)
    ? (session?.activePath ?? undefined)
    : undefined;
  const available = availablePaths ? new Set(availablePaths) : undefined;
  const favorites = normalizeFavorites(session?.favorites).filter((path) =>
    available ? available.has(path) : true,
  );

  return {
    tabs,
    activePath,
    leftCollapsed: session?.leftCollapsed ?? false,
    rightCollapsed: session?.rightCollapsed ?? false,
    favorites,
  };
}

/** Explicit alias for callers restoring data after the vault tree is loaded. */
export const normalizeRestoredSession = normalizeSession;

function normalizeState(state: SessionState): SessionState {
  const tabs = normalizeSessionTabs(state.tabs);
  return {
    ...state,
    tabs,
    activePath: pathIsOpen(tabs, state.activePath)
      ? state.activePath
      : undefined,
    favorites: normalizeFavorites(state.favorites),
  };
}

function openPinned(state: SessionState, path: string): SessionState {
  if (!path) return state;
  const index = state.tabs.findIndex((tab) => tab.path === path);
  if (index >= 0) {
    if (!state.tabs[index].preview) {
      return { ...state, activePath: path };
    }
    const tabs = [...state.tabs];
    tabs[index] = { ...tabs[index], preview: false };
    return { ...state, tabs, activePath: path };
  }
  return {
    ...state,
    tabs: [...state.tabs, { path, preview: false }],
    activePath: path,
  };
}

function openPreview(state: SessionState, path: string): SessionState {
  if (!path) return state;
  const existingIndex = state.tabs.findIndex((tab) => tab.path === path);
  if (existingIndex >= 0) {
    // A single click on an existing pinned tab only activates it.
    return { ...state, activePath: path };
  }

  const previewIndex = state.tabs.findIndex((tab) => tab.preview);
  const tabs = [...state.tabs];
  if (previewIndex >= 0) {
    tabs[previewIndex] = { path, preview: true };
  } else {
    tabs.push({ path, preview: true });
  }
  return { ...state, tabs, activePath: path };
}

function fallbackAfterRemoval(
  tabs: readonly EditorTab[],
  removedIndex: number,
): string | undefined {
  return tabs[removedIndex]?.path ?? tabs[removedIndex - 1]?.path;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  const current = normalizeState(state);

  switch (action.type) {
    case "open":
      // Keep the old action as a pinned-open compatibility path. New callers
      // should choose open-preview or open-pinned explicitly.
      return openPinned(current, action.path);
    case "open-preview":
      return openPreview(current, action.path);
    case "open-pinned":
      return openPinned(current, action.path);
    case "pin": {
      const index = current.tabs.findIndex((tab) => tab.path === action.path);
      if (index < 0) return current;
      if (!current.tabs[index].preview) {
        return { ...current, activePath: action.path };
      }
      const tabs = [...current.tabs];
      tabs[index] = { ...tabs[index], preview: false };
      return { ...current, tabs, activePath: action.path };
    }
    case "activate":
      return pathIsOpen(current.tabs, action.path)
        ? { ...current, activePath: action.path }
        : current;
    case "close": {
      const index = current.tabs.findIndex((tab) => tab.path === action.path);
      if (index < 0) return current;
      const tabs = current.tabs.filter((tab) => tab.path !== action.path);
      const activePath =
        current.activePath === action.path
          ? fallbackAfterRemoval(tabs, index)
          : current.activePath;
      return { ...current, tabs, activePath };
    }
    case "reorder": {
      if (
        action.from < 0 ||
        action.from >= current.tabs.length ||
        action.to < 0 ||
        action.to >= current.tabs.length
      ) {
        return current;
      }
      const tabs = [...current.tabs];
      const [moved] = tabs.splice(action.from, 1);
      if (!moved) return current;
      tabs.splice(action.to, 0, moved);
      return { ...current, tabs };
    }
    case "restore":
      return normalizeSession(
        action.session,
        action.availablePaths ?? action.validPaths,
      );
    case "rename": {
      if (!action.from || !action.to || action.from === action.to) {
        return current;
      }
      const renamePath = (path: string) =>
        path === action.from || path.startsWith(`${action.from}/`)
          ? `${action.to}${path.slice(action.from.length)}`
          : path;
      return {
        ...current,
        tabs: current.tabs.map((tab) => ({
          ...tab,
          path: renamePath(tab.path),
        })),
        activePath: current.activePath
          ? renamePath(current.activePath)
          : current.activePath,
        favorites: current.favorites.map(renamePath),
      };
    }
    case "remove": {
      const removed = (path: string) =>
        path === action.path || path.startsWith(`${action.path}/`);
      const firstRemovedIndex = current.tabs.findIndex((tab) =>
        removed(tab.path),
      );
      const tabs = current.tabs.filter((tab) => !removed(tab.path));
      return {
        ...current,
        tabs,
        activePath:
          current.activePath && removed(current.activePath)
            ? fallbackAfterRemoval(tabs, firstRemovedIndex)
            : current.activePath,
        favorites: current.favorites.filter((path) => !removed(path)),
      };
    }
    case "toggle-left":
      return { ...current, leftCollapsed: !current.leftCollapsed };
    case "toggle-right":
      return { ...current, rightCollapsed: !current.rightCollapsed };
    case "set-left":
      return { ...current, leftCollapsed: action.value };
    case "set-right":
      return { ...current, rightCollapsed: action.value };
    case "toggle-favorite": {
      const favorites = current.favorites.includes(action.path)
        ? current.favorites.filter((path) => path !== action.path)
        : [...current.favorites, action.path];
      return { ...current, favorites };
    }
    default:
      return current;
  }
}

export function cycleTab(state: SessionState, delta: number) {
  const current = normalizeState(state);
  if (current.tabs.length === 0) {
    return current.activePath;
  }
  const index = current.tabs.findIndex(
    (tab) => tab.path === current.activePath,
  );
  const next = (index + delta + current.tabs.length) % current.tabs.length;
  return current.tabs[next]?.path;
}
