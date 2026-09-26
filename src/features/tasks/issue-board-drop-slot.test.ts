import { describe, expect, it } from "vitest";
import { dropSlotHeightPx } from "@/features/tasks/issue-board-drop-slot";

function box(height: number) {
  return {
    height,
    width: 0,
    top: 0,
    left: 0,
    bottom: height,
    right: 0,
    x: 0,
    y: 0,
    toJSON() {},
  } satisfies DOMRect;
}

describe("dropSlotHeightPx", () => {
  it("prefers the dragged card height over a neighbor", () => {
    const parent = document.createElement("div");
    const dragging = document.createElement("button");
    dragging.dataset.dragging = "true";
    dragging.getBoundingClientRect = () => box(118);
    const neighbor = document.createElement("button");
    neighbor.getBoundingClientRect = () => box(96);
    parent.append(dragging, neighbor);
    expect(dropSlotHeightPx(parent, neighbor)).toBe(118);
  });

  it("falls back to the preferred card when nothing is dragging", () => {
    const parent = document.createElement("div");
    const neighbor = document.createElement("button");
    neighbor.getBoundingClientRect = () => box(124);
    parent.append(neighbor);
    expect(dropSlotHeightPx(parent, neighbor)).toBe(124);
  });
});
