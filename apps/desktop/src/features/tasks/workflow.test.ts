import { describe, expect, it } from "vitest";
import {
  boardColumns,
  customWorkflowId,
  issueCategory,
  validStatusForProject,
  visibleStatusForProject,
} from "@/features/tasks/workflow";
import type { TaskIssue, TaskProject } from "@/lib/copper/tasks";

const project = (id: string, label: string): TaskProject => ({
  path: `Tasks/Projects/${id}.md`,
  id,
  title: id,
  status: "started",
  labels: [],
  start: null,
  target: null,
  workflow: [
    { id: "todo", label: "Todo", category: "unstarted" },
    { id: `${id}--${label}`, label, category: "started" },
    { id: "in_progress", label: "In Progress", category: "started" },
    { id: "done", label: "Done", category: "completed" },
    { id: "canceled", label: "Canceled", category: "canceled" },
  ],
  counts: {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    canceled: 0,
  },
});

const issue = (projectId: string, status: string): TaskIssue => ({
  path: "Tasks/Issues/ONE.md",
  id: "ONE",
  title: "One",
  status,
  priority: "none",
  project: projectId,
  labels: [],
  due: null,
  rank: "A",
  created: "",
  updated: "",
});

describe("task workflows", () => {
  it("builds a deterministic unified union and keeps recovery columns", () => {
    const alpha = project("alpha", "review");
    const beta = project("beta", "verify");
    const columns = boardColumns(
      [issue("alpha", "alpha--review"), issue("beta", "legacy-status")],
      [beta, alpha],
      null,
    );
    expect(columns.map(({ id }) => id)).toEqual([
      "todo",
      "in_progress",
      "in_review",
      "done",
      "canceled",
      "alpha--review",
      "beta--verify",
      "legacy-status",
    ]);
  });

  it("keeps hidden statuses valid but removes them from project and unified boards", () => {
    const alpha = project("alpha", "review");
    alpha.workflow = [
      ...(alpha.workflow ?? []),
      {
        id: "in_review",
        label: "In Review",
        category: "started",
        hidden: true,
      },
    ];
    const review = issue("alpha", "in_review");
    expect(validStatusForProject(review.status, alpha)).toBe(true);
    expect(visibleStatusForProject(review.status, alpha)).toBe(false);
    expect(boardColumns([review], [alpha], alpha.id)).not.toContainEqual(
      expect.objectContaining({ id: "in_review" }),
    );
    expect(boardColumns([review], [alpha], null)).not.toContainEqual(
      expect.objectContaining({ id: "in_review" }),
    );
  });

  it("uses categories for filtering and rejects another project's column", () => {
    const alpha = project("alpha", "review");
    const review = issue("alpha", "alpha--review");
    expect(issueCategory(review, [alpha])).toBe("started");
    expect(validStatusForProject(review.status, alpha)).toBe(true);
    expect(
      validStatusForProject(review.status, project("beta", "verify")),
    ).toBe(false);
    expect(customWorkflowId("alpha", "Ready for QA")).toBe(
      "alpha--ready-for-qa",
    );
  });
});
