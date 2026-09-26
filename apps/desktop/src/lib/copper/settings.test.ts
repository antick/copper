import { describe, expect, it } from "vitest";
import {
  normalizeSettings,
  normalizeVaultSession,
} from "@/lib/copper/settings";

describe("normalizeVaultSession", () => {
  it("defaults workspace fields from older sessions", () => {
    expect(normalizeVaultSession({ tabs: [], favorites: [] })).toMatchObject({
      workspaceMode: "notes",
      tasksView: "board",
      tasksProject: null,
      tasksDestination: "all",
      tasksProjectView: "board",
      activeTasksTabId: "tasks-home",
      tasksTabs: [
        expect.objectContaining({
          id: "tasks-home",
          target: { kind: "destination", destination: "all", view: "board" },
        }),
      ],
    });
  });

  it("round-trips valid task tabs and drops malformed targets", () => {
    const session = normalizeVaultSession({
      tasksTabs: [
        {
          id: "project",
          target: { kind: "project", project: "copper", view: "issues" },
          back: [{ kind: "destination", destination: "all", view: "board" }],
          forward: [],
          preview: false,
        },
        { id: "broken", target: { kind: "issue", issue: "" } },
      ],
      activeTasksTabId: "project",
    });
    expect(session.activeTasksTabId).toBe("project");
    expect(session.tasksTabs).toHaveLength(1);
    expect(session.tasksTabs[0].back).toHaveLength(1);
  });

  it("keeps a saved Tasks board scope", () => {
    expect(
      normalizeVaultSession({
        workspaceMode: "tasks",
        tasksView: "list",
        tasksProject: "copper",
      }),
    ).toMatchObject({
      workspaceMode: "tasks",
      tasksView: "list",
      tasksProject: "copper",
      tasksDestination: "project",
      tasksProjectView: "issues",
    });
  });

  it("keeps saved Tasks destinations and project surfaces", () => {
    expect(
      normalizeVaultSession({
        tasksDestination: "projects",
        tasksProjectView: "overview",
      }),
    ).toMatchObject({
      tasksDestination: "projects",
      tasksProjectView: "overview",
    });
  });

  it("normalizes task navigation order and bounded issue columns", () => {
    expect(
      normalizeVaultSession({
        tasksDestination: "completed",
        tasksProjectOrder: ["two", "one", "two", ""],
        tasksPinnedProjects: ["one", "one"],
        tasksListColumnWidths: { id: 2, title: 9999 },
      }),
    ).toMatchObject({
      tasksDestination: "all",
      tasksProjectOrder: ["two", "one"],
      tasksPinnedProjects: ["one"],
      tasksListColumnWidths: { id: 72, title: 560 },
    });
  });
});

describe("normalizeSettings", () => {
  it("validates issue prefixes", () => {
    expect(normalizeSettings({ issueIdPrefix: "work2" })).toMatchObject({
      issueIdPrefix: "WORK2",
    });
    expect(normalizeSettings({ issueIdPrefix: "1bad" })).toMatchObject({
      issueIdPrefix: "ISSUE",
    });
  });
});
