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
        "Tasks/Issues/NOTE-8-legacy.md",
        "---\ntype: issue\nid: NOTE-8\nstatus: todo\nrank: A\n---\n# Legacy\n",
      ],
      [
        "Tasks/Issues/ISSUE-2-current.md",
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
        "Tasks/Issues/I-8-existing.md",
        "---\ntype: issue\nid: I-8\n---\n# Existing\n",
      ],
      [
        "Tasks/Issues/#3-existing.md",
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
