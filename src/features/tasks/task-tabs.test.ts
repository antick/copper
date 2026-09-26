import { describe, expect, it } from "vitest";
import {
  initialTaskTabsState,
  legacyTaskTarget,
  taskTabsReducer,
} from "@/features/tasks/task-tabs";
import type { TasksTabTarget } from "@/lib/copper/settings";

const project = (view: "overview" | "issues" | "board"): TasksTabTarget => ({
  kind: "project",
  project: "copper",
  view,
});

describe("taskTabsReducer", () => {
  it("restores legacy sessions without task fields to the board", () => {
    expect(legacyTaskTarget({})).toEqual({
      kind: "destination",
      destination: "all",
      view: "board",
    });
  });

  it("keeps a single replaceable preview until it is pinned", () => {
    let state = taskTabsReducer(initialTaskTabsState, {
      type: "open-preview",
      id: "preview-one",
      target: { kind: "destination", destination: "backlog", view: "list" },
    });
    expect(state.tabs).toHaveLength(2);
    state = taskTabsReducer(state, {
      type: "open-preview",
      id: "preview-two",
      target: { kind: "destination", destination: "completed", view: "list" },
    });
    expect(state.tabs.filter((tab) => tab.preview)).toHaveLength(1);
    expect(state.tabs.some((tab) => tab.id === "preview-one")).toBe(false);
    state = taskTabsReducer(state, { type: "pin", id: "preview-two" });
    expect(state.tabs.find((tab) => tab.id === "preview-two")?.preview).toBe(
      false,
    );
  });
  it("keeps independent history in each open tab", () => {
    let state = taskTabsReducer(initialTaskTabsState, {
      type: "navigate",
      target: project("overview"),
    });
    state = taskTabsReducer(state, {
      type: "open-pinned",
      id: "backlog",
      target: { kind: "destination", destination: "backlog", view: "list" },
    });
    state = taskTabsReducer(state, { type: "activate", id: "tasks-home" });
    state = taskTabsReducer(state, {
      type: "navigate",
      target: project("board"),
    });
    state = taskTabsReducer(state, { type: "back" });

    expect(state.tabs[0].target).toEqual(project("overview"));
    expect(state.tabs[1].target).toMatchObject({ destination: "backlog" });
  });

  it("closes, selects the adjacent tab, and restores position", () => {
    let state = taskTabsReducer(initialTaskTabsState, {
      type: "open-pinned",
      id: "issue",
      target: { kind: "issue", issue: "COPP-12" },
    });
    state = taskTabsReducer(state, { type: "close", id: "issue" });
    expect(state.activeTabId).toBe("tasks-home");
    state = taskTabsReducer(state, { type: "reopen" });
    expect(state.activeTabId).toBe("issue");
    expect(state.tabs[1].target).toEqual({ kind: "issue", issue: "COPP-12" });
  });

  it("restores a safe fallback for malformed persisted tabs", () => {
    const state = taskTabsReducer(initialTaskTabsState, {
      type: "restore",
      tabs: [{ id: "bad", target: { kind: "issue", issue: "" } }],
      activeTabId: "bad",
      fallback: project("issues"),
    });
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].target).toEqual(project("issues"));
  });
});
