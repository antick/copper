import { describe, expect, it } from "vitest";
import {
  filterIssues,
  isTypingTarget,
  sortIssues,
} from "@/features/tasks/filter-issues";
import type { TaskIssue } from "@/lib/copper/tasks";

function issue(
  partial: Partial<TaskIssue> & Pick<TaskIssue, "id" | "title">,
): TaskIssue {
  return {
    path: `Tasks/Issues/${partial.id}.md`,
    status: "todo",
    priority: "none",
    project: null,
    labels: [],
    due: null,
    rank: "A",
    created: "",
    updated: "",
    ...partial,
  };
}

describe("filterIssues", () => {
  const issues = [
    issue({
      id: "A-1",
      title: "Todo copper",
      status: "todo",
      project: "copper",
    }),
    issue({ id: "A-2", title: "Done item", status: "done", project: "copper" }),
    issue({ id: "A-3", title: "Canceled", status: "canceled" }),
  ];

  it("keeps only todo and in_progress for Active", () => {
    expect(
      filterIssues(issues, "active", null, "").map((item) => item.id),
    ).toEqual(["A-1"]);
  });

  it("scopes to a project and search query", () => {
    expect(
      filterIssues(issues, "all", "copper", "todo").map((item) => item.id),
    ).toEqual(["A-1"]);
  });
});

describe("sortIssues", () => {
  it("sorts by rank then id", () => {
    const issues = [
      issue({ id: "B-2", title: "Two", rank: "B" }),
      issue({ id: "B-1", title: "One", rank: "A" }),
    ];
    expect(sortIssues(issues, "rank").map((item) => item.id)).toEqual([
      "B-1",
      "B-2",
    ]);
  });
});

describe("isTypingTarget", () => {
  it("treats inputs and CodeMirror as typing targets", () => {
    const input = document.createElement("input");
    const outside = document.createElement("div");
    const cm = document.createElement("div");
    cm.className = "cm-editor";
    const nested = document.createElement("span");
    cm.append(nested);
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(nested)).toBe(true);
    expect(isTypingTarget(outside)).toBe(false);
  });
});
