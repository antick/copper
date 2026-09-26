import type {
  TasksDestination,
  TasksProjectView,
  TasksSessionTab,
  TasksSessionTabInput,
  TasksTabTarget,
  TasksView,
} from "@/lib/copper/settings";
import { normalizeTasksSessionTabs } from "@/lib/copper/settings";

const CLOSED_TAB_LIMIT = 10;
const HISTORY_LIMIT = 50;

export interface ClosedTaskTab {
  tab: TasksSessionTab;
  index: number;
}

export interface TaskTabsState {
  tabs: TasksSessionTab[];
  activeTabId: string;
  closed: ClosedTaskTab[];
}

export type TaskTabsAction =
  | {
      type: "restore";
      tabs?: readonly TasksSessionTabInput[] | null;
      activeTabId?: string | null;
      fallback: TasksTabTarget;
    }
  | { type: "navigate"; target: TasksTabTarget }
  | { type: "replace"; target: TasksTabTarget }
  | {
      type: "open-pinned";
      id: string;
      target: TasksTabTarget;
    }
  | { type: "open-preview"; id: string; target: TasksTabTarget }
  | { type: "activate"; id: string }
  | { type: "pin"; id: string }
  | { type: "close"; id: string }
  | { type: "reopen" }
  | { type: "reorder"; from: number; to: number }
  | { type: "back" }
  | { type: "forward" };

const HOME_TARGET: TasksTabTarget = {
  kind: "destination",
  destination: "all",
  view: "board",
};

export const initialTaskTabsState: TaskTabsState = {
  tabs: normalizeTasksSessionTabs(undefined, HOME_TARGET),
  activeTabId: "tasks-home",
  closed: [],
};

export function taskTargetKey(target: TasksTabTarget) {
  if (target.kind === "issue") return `issue:${target.issue}`;
  if (target.kind === "project")
    return `project:${target.project}:${target.view}`;
  return `destination:${target.destination}:${target.view}`;
}

export function resolveTaskTarget(target: TasksTabTarget) {
  const destination: TasksDestination =
    target.kind === "project"
      ? "project"
      : target.kind === "destination"
        ? target.destination
        : "all";
  const projectView = target.kind === "project" ? target.view : "issues";
  return {
    destination,
    project: target.kind === "project" ? target.project : null,
    projectView,
    view:
      target.kind === "destination"
        ? target.view
        : projectView === "board"
          ? ("board" as const)
          : ("list" as const),
    issue: target.kind === "issue" ? target.issue : null,
  };
}

function targetsEqual(a: TasksTabTarget, b: TasksTabTarget) {
  return taskTargetKey(a) === taskTargetKey(b);
}

function activeIndex(state: TaskTabsState) {
  return Math.max(
    0,
    state.tabs.findIndex((tab) => tab.id === state.activeTabId),
  );
}

function navigateHistory(
  state: TaskTabsState,
  direction: "back" | "forward",
): TaskTabsState {
  const index = activeIndex(state);
  const tab = state.tabs[index];
  const source = direction === "back" ? tab?.back : tab?.forward;
  const target = source?.at(-1);
  if (!tab || !target) return state;
  const tabs = [...state.tabs];
  tabs[index] = {
    ...tab,
    target,
    back:
      direction === "back"
        ? tab.back.slice(0, -1)
        : [...tab.back, tab.target].slice(-HISTORY_LIMIT),
    forward:
      direction === "forward"
        ? tab.forward.slice(0, -1)
        : [...tab.forward, tab.target].slice(-HISTORY_LIMIT),
  };
  return { ...state, tabs };
}

export function taskTabsReducer(
  state: TaskTabsState,
  action: TaskTabsAction,
): TaskTabsState {
  switch (action.type) {
    case "restore": {
      const tabs = normalizeTasksSessionTabs(action.tabs, action.fallback);
      const activeTabId = tabs.some((tab) => tab.id === action.activeTabId)
        ? (action.activeTabId ?? tabs[0].id)
        : tabs[0].id;
      return { tabs, activeTabId, closed: [] };
    }
    case "navigate": {
      const index = activeIndex(state);
      const tab = state.tabs[index];
      if (!tab || targetsEqual(tab.target, action.target)) return state;
      const tabs = [...state.tabs];
      tabs[index] = {
        ...tab,
        target: action.target,
        back: [...tab.back, tab.target].slice(-HISTORY_LIMIT),
        forward: [],
      };
      return { ...state, tabs };
    }
    case "replace": {
      const index = activeIndex(state);
      const tabs = [...state.tabs];
      const tab = tabs[index];
      if (!tab) return state;
      tabs[index] = { ...tab, target: action.target };
      return { ...state, tabs };
    }
    case "open-pinned":
      return {
        ...state,
        tabs: [
          ...state.tabs,
          {
            id: action.id,
            target: action.target,
            back: [],
            forward: [],
            preview: false,
          },
        ],
        activeTabId: action.id,
      };
    case "open-preview": {
      const previewIndex = state.tabs.findIndex((tab) => tab.preview);
      const preview = {
        id: action.id,
        target: action.target,
        back: [],
        forward: [],
        preview: true,
      };
      if (previewIndex < 0)
        return {
          ...state,
          tabs: [...state.tabs, preview],
          activeTabId: action.id,
        };
      const tabs = [...state.tabs];
      tabs[previewIndex] = preview;
      return { ...state, tabs, activeTabId: action.id };
    }
    case "activate":
      return state.tabs.some((tab) => tab.id === action.id)
        ? { ...state, activeTabId: action.id }
        : state;
    case "pin":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.id ? { ...tab, preview: false } : tab,
        ),
      };
    case "close": {
      const index = state.tabs.findIndex((tab) => tab.id === action.id);
      const removed = state.tabs[index];
      if (!removed || state.tabs.length === 1) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      return {
        tabs,
        activeTabId:
          state.activeTabId === action.id
            ? (tabs[index]?.id ?? tabs[index - 1]?.id ?? tabs[0].id)
            : state.activeTabId,
        closed: [{ tab: removed, index }, ...state.closed].slice(
          0,
          CLOSED_TAB_LIMIT,
        ),
      };
    }
    case "reopen": {
      const restored = state.closed[0];
      if (!restored) return state;
      const tabs = [...state.tabs];
      tabs.splice(Math.min(restored.index, tabs.length), 0, restored.tab);
      return {
        tabs,
        activeTabId: restored.tab.id,
        closed: state.closed.slice(1),
      };
    }
    case "reorder": {
      if (
        action.from < 0 ||
        action.from >= state.tabs.length ||
        action.to < 0 ||
        action.to >= state.tabs.length ||
        action.from === action.to
      )
        return state;
      const tabs = [...state.tabs];
      const [tab] = tabs.splice(action.from, 1);
      if (!tab) return state;
      tabs.splice(action.to, 0, tab);
      return { ...state, tabs };
    }
    case "back":
      return navigateHistory(state, "back");
    case "forward":
      return navigateHistory(state, "forward");
    default:
      return state;
  }
}

export function cycleTaskTab(state: TaskTabsState, delta: number) {
  const index = activeIndex(state);
  return state.tabs[(index + delta + state.tabs.length) % state.tabs.length]
    ?.id;
}

export function taskTabId() {
  return globalThis.crypto?.randomUUID?.() ?? `tasks-${Date.now()}`;
}

export function legacyTaskTarget(values: {
  tasksView?: TasksView;
  tasksProject?: string | null;
  tasksDestination?: TasksDestination;
  tasksProjectView?: TasksProjectView;
}): TasksTabTarget {
  const view = values.tasksView === "list" ? "list" : "board";
  const destination = values.tasksDestination ?? "all";
  const normalizedDestination =
    destination === "active" ||
    destination === "backlog" ||
    destination === "completed"
      ? "all"
      : destination;
  return normalizedDestination === "project" && values.tasksProject
    ? {
        kind: "project",
        project: values.tasksProject,
        view:
          values.tasksProjectView ?? (view === "board" ? "board" : "issues"),
      }
    : {
        kind: "destination",
        destination:
          normalizedDestination === "project" ? "all" : normalizedDestination,
        view,
      };
}

export function legacyTaskFields(target: TasksTabTarget) {
  if (target.kind === "project") {
    return {
      tasksView:
        target.view === "board" ? ("board" as const) : ("list" as const),
      tasksProject: target.project,
      tasksDestination: "project" as const,
      tasksProjectView: target.view,
    };
  }
  if (target.kind === "destination") {
    return {
      tasksView: target.view,
      tasksProject: null,
      tasksDestination: target.destination,
      tasksProjectView:
        target.view === "board" ? ("board" as const) : ("issues" as const),
    };
  }
  return {
    tasksView: "list" as const,
    tasksProject: null,
    tasksDestination: "all" as const,
    tasksProjectView: "issues" as const,
  };
}
