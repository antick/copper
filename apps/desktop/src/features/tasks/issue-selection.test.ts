import { describe, expect, it } from "vitest";
import {
  emptyIssueSelection,
  issueSelectionReducer,
} from "@/features/tasks/issue-selection";

describe("issueSelectionReducer", () => {
  it("toggles and extends a contiguous range", () => {
    let state = issueSelectionReducer(emptyIssueSelection, {
      type: "toggle",
      id: "A",
    });
    state = issueSelectionReducer(state, {
      type: "range",
      id: "C",
      order: ["A", "B", "C", "D"],
    });
    expect(state.ids).toEqual(["A", "B", "C"]);
  });

  it("keeps a selected set on right-click and retargets an unselected issue", () => {
    const selected = { ids: ["A", "B"], focusedId: "B", anchorId: "A" };
    expect(
      issueSelectionReducer(selected, { type: "context", id: "B" }).ids,
    ).toEqual(["A", "B"]);
    expect(
      issueSelectionReducer(selected, { type: "context", id: "C" }).ids,
    ).toEqual(["C"]);
  });
});
