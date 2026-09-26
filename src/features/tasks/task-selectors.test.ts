import { describe, expect, it } from "vitest";
import {
  duplicateIssueInput,
  formatTaskDate,
  formatTaskTimestamp,
  issuesForDestination,
  summarizeProject,
  TASK_VISIBLE_PROPERTIES,
  taskBody,
  taskDescription,
} from "@/features/tasks/task-selectors";
import type { TaskIssue, TaskProject } from "@/lib/copper/tasks";

const issue = (id: string, status: TaskIssue["status"]): TaskIssue => ({
  path: `${id}.md`,
  id,
  title: id,
  status,
  priority: "none",
  project: null,
  labels: [],
  due: null,
  rank: id,
  created: "",
  updated: "",
});

describe("task selectors", () => {
  const issues = [
    issue("A", "backlog"),
    issue("B", "todo"),
    issue("C", "in_progress"),
    issue("D", "done"),
    issue("E", "canceled"),
  ];

  it("maps built-in destinations to status sets", () => {
    expect(issuesForDestination(issues, "active").map(({ id }) => id)).toEqual([
      "B",
      "C",
    ]);
    expect(issuesForDestination(issues, "backlog").map(({ id }) => id)).toEqual(
      ["A"],
    );
    expect(
      issuesForDestination(issues, "completed").map(({ id }) => id),
    ).toEqual(["D", "E"]);
  });

  it("derives project progress", () => {
    const project: TaskProject = {
      path: "project.md",
      id: "copper",
      title: "Copper",
      status: "started",
      labels: [],
      start: null,
      target: null,
      counts: {
        backlog: 1,
        todo: 1,
        in_progress: 1,
        in_review: 0,
        done: 2,
        canceled: 0,
      },
    };
    expect(summarizeProject(project)).toEqual({
      total: 5,
      done: 2,
      open: 3,
      progress: 40,
    });
  });

  it("formats canonical task dates consistently", () => {
    expect(formatTaskDate("2026-09-08")).toBe("Sep 8, 2026");
    expect(formatTaskDate("invalid")).toBe("");
    expect(formatTaskTimestamp("invalid")).toBe("");
    expect(formatTaskTimestamp("2026-09-08T12:30:00Z")).toMatch(/Sep 8, 2026/);
    expect(TASK_VISIBLE_PROPERTIES).toContain("due");
  });

  it("builds a duplicate create payload ranked after the source", () => {
    const source: TaskIssue = {
      ...issue("COPP-1", "todo"),
      title: "Fast board",
      labels: ["ui"],
      body: "# Fast board\n\nShip it.\n",
    };
    expect(duplicateIssueInput(source)).toEqual({
      title: "Fast board",
      project: null,
      status: "todo",
      priority: "none",
      labels: ["ui"],
      due: null,
      body: "Ship it.\n",
      afterId: "COPP-1",
    });
  });

  it("edits descriptions without duplicating or deleting the title heading", () => {
    expect(taskDescription("\n# Fast board\n\nShip it.\n")).toBe("Ship it.\n");
    expect(taskBody("Fast board", "Ship it.\n")).toBe(
      "# Fast board\n\nShip it.\n",
    );
  });
});
