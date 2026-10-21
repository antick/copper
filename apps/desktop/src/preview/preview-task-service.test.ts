import { describe, expect, it } from "vitest";
import {
  dispatchPreviewTask,
  parsePreviewWorkflow,
} from "@/preview/preview-task-service";

describe("preview task workflow compatibility", () => {
  it("falls back for empty metadata and upgrades a valid legacy workflow", () => {
    expect(parsePreviewWorkflow([]).map(({ id }) => id)).toEqual([
      "todo",
      "in_progress",
      "in_review",
      "done",
      "canceled",
    ]);
    expect(
      parsePreviewWorkflow([
        { id: "todo", label: "Todo", category: "unstarted" },
        { id: "in_progress", label: "In Progress", category: "started" },
        { id: "demo--qa", label: "QA", category: "started", hidden: true },
        { id: "done", label: "Done", category: "completed" },
        { id: "canceled", label: "Canceled", category: "canceled" },
      ]),
    ).toEqual([
      { id: "todo", label: "Todo", category: "unstarted" },
      { id: "in_progress", label: "In Progress", category: "started" },
      { id: "in_review", label: "In Review", category: "started" },
      { id: "demo--qa", label: "QA", category: "started", hidden: true },
      { id: "done", label: "Done", category: "completed" },
      { id: "canceled", label: "Canceled", category: "canceled" },
    ]);
  });

  it("allocates independent issue prefix sequences", () => {
    const files = new Map([
      [
        ".copper/tasks/issues/NOTE-8-legacy.md",
        "---\ntype: issue\nid: NOTE-8\nstatus: todo\nrank: A\n---\n# Legacy\n",
      ],
      [
        ".copper/tasks/issues/ISSUE-2-current.md",
        "---\ntype: issue\nid: ISSUE-2\nstatus: todo\nrank: B\n---\n# Current\n",
      ],
    ]);
    expect(
      dispatchPreviewTask("create_issue", { title: "Next" }, files, "ISSUE"),
    ).toMatchObject({ id: "ISSUE-3" });
    expect(
      dispatchPreviewTask("create_issue", { title: "Work" }, files, "WORK"),
    ).toMatchObject({ id: "WORK-1" });
  });

  it("keeps preview allocation in sync for one-character and hash prefixes", () => {
    const files = new Map([
      [
        ".copper/tasks/issues/I-8-existing.md",
        "---\ntype: issue\nid: I-8\n---\n# Existing\n",
      ],
      [
        ".copper/tasks/issues/#3-existing.md",
        "---\ntype: issue\nid: #3\n---\n# Existing hash\n",
      ],
    ]);
    expect(
      dispatchPreviewTask("create_issue", { title: "One" }, files, "I"),
    ).toMatchObject({ id: "I-9" });
    expect(
      dispatchPreviewTask("create_issue", { title: "Hash" }, files, "#"),
    ).toMatchObject({ id: "#4" });
  });
});

it("keeps archived issues out of active counts while exposing them for recovery", () => {
  const files = new Map([
    [
      ".copper/tasks/projects/test.md",
      "---\ntype: project\nid: test\n---\n# Test\n",
    ],
    [
      ".copper/tasks/issues/ISSUE-1.md",
      "---\ntype: issue\nid: ISSUE-1\nproject: test\nstatus: todo\n---\n# Active\n",
    ],
    [
      ".copper/tasks/archive/issues/ISSUE-2.md",
      "---\ntype: issue\nid: ISSUE-2\nproject: test\nstatus: todo\n---\n# Archived\n",
    ],
  ]);
  expect(dispatchPreviewTask("list_issues", {}, files)).toEqual([
    expect.objectContaining({ id: "ISSUE-1" }),
  ]);
  expect(
    dispatchPreviewTask("list_issues", { includeArchived: true }, files),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "ISSUE-1" }),
      expect.objectContaining({ id: "ISSUE-2" }),
    ]),
  );
  expect(
    dispatchPreviewTask("get_project", { id: "test" }, files),
  ).toMatchObject({ counts: { todo: 1 } });
});
