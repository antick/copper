import { describe, expect, it } from "vitest";
import {
  boardCardAnimateLayoutChanges,
  boardDropSlot,
  resolveIssueCollisions,
} from "@/features/tasks/issue-board-dnd";
import type { TaskIssue } from "@/lib/copper/tasks";

function rect(top: number, height = 96) {
  return {
    top,
    left: 0,
    right: 280,
    bottom: top + height,
    width: 280,
    height,
  };
}

function collisionArgs(
  containers: {
    id: string;
    data: { current?: { type?: string; status?: string } };
  }[],
  rects: Record<string, ReturnType<typeof rect>>,
  collisionTop: number,
) {
  return {
    active: {
      id: "COPP-1",
      data: { current: { type: "issue", status: "todo" } },
    },
    collisionRect: rect(collisionTop),
    droppableRects: new Map(Object.entries(rects)),
    droppableContainers: containers,
    pointerCoordinates: { x: 40, y: collisionTop + 10 },
  } as never;
}

describe("board card drag motion", () => {
  it("does not replay layout animation while sorting or after a drag", () => {
    const args = {
      active: null,
      containerId: "todo",
      isDragging: false,
      isSorting: false,
      id: "COPP-1",
      index: 1,
      items: ["COPP-1", "COPP-2"],
      previousItems: ["COPP-1", "COPP-2"],
      previousContainerId: "todo",
      newIndex: 0,
      transition: { duration: 200, easing: "ease" },
      wasDragging: false,
    };
    expect(boardCardAnimateLayoutChanges({ ...args, isSorting: true })).toBe(
      false,
    );
    expect(boardCardAnimateLayoutChanges({ ...args, wasDragging: true })).toBe(
      false,
    );
  });

  it("keeps populated-lane gap hits on the nearest card", () => {
    const containers = [
      {
        id: "column:todo",
        data: { current: { type: "issue-lane", status: "todo" } },
      },
      {
        id: "COPP-1",
        data: { current: { type: "issue", status: "todo" } },
      },
      {
        id: "COPP-2",
        data: { current: { type: "issue", status: "todo" } },
      },
    ];
    const rects = {
      "column:todo": rect(0, 400),
      "COPP-1": rect(24),
      "COPP-2": rect(140),
    };
    expect(
      resolveIssueCollisions(
        [{ id: "COPP-2" }, { id: "column:todo" }],
        collisionArgs(containers, rects, 150),
      ).map(({ id }) => id),
    ).toEqual(["COPP-2"]);
    expect(
      resolveIssueCollisions(
        [{ id: "column:todo" }],
        collisionArgs(containers, rects, 150),
      )[0]?.id,
    ).toBe("COPP-2");
    expect(
      resolveIssueCollisions(
        [{ id: "column:todo" }],
        collisionArgs(
          [
            {
              id: "column:todo",
              data: { current: { type: "issue-lane", status: "todo" } },
            },
          ],
          { "column:todo": rect(0, 400) },
          80,
        ),
      ).map(({ id }) => id),
    ).toEqual(["column:todo"]);
  });

  it("places a drop slot before or after the target, not on self", () => {
    const issues: TaskIssue[] = [
      issue("COPP-1", "todo"),
      issue("COPP-2", "todo"),
      issue("COPP-3", "in_progress"),
    ];
    expect(boardDropSlot(issues, "COPP-1", "COPP-1")).toBeNull();
    expect(boardDropSlot(issues, "COPP-1", "COPP-2")).toEqual({
      status: "todo",
      beforeId: null,
      afterId: "COPP-2",
    });
    expect(boardDropSlot(issues, "COPP-2", "COPP-1")).toEqual({
      status: "todo",
      beforeId: "COPP-1",
      afterId: null,
    });
    expect(boardDropSlot(issues, "COPP-3", "column:todo")).toEqual({
      status: "todo",
      beforeId: null,
      afterId: "COPP-2",
    });
    expect(boardDropSlot(issues, "COPP-1", "column:in_review")).toEqual({
      status: "in_review",
      beforeId: null,
      afterId: null,
    });
  });
});

function issue(id: string, status: TaskIssue["status"]): TaskIssue {
  return {
    path: `Tasks/Issues/${id}.md`,
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
    body: "",
  };
}
