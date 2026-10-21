import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BoardDropSlot,
  dropSlotHeightPx,
} from "@/features/tasks/issue-board-drop-slot";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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

  it("uses the dragged card height when it comes from another column", () => {
    const board = document.createElement("div");
    board.className = "copper-task-board";
    const source = document.createElement("button");
    source.dataset.dragging = "true";
    source.getBoundingClientRect = () => box(160);
    const parent = document.createElement("div");
    const neighbor = document.createElement("button");
    neighbor.getBoundingClientRect = () => box(96);
    parent.append(neighbor);
    board.append(source, parent);
    expect(dropSlotHeightPx(parent, neighbor)).toBe(160);
  });
});

it("makes room for an incoming card and restores neighbors on cancel", () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    box(96),
  );
  vi.stubGlobal("CSS", { ...CSS, escape: (value: string) => value });
  const content = (additionalCard = false) => (
    <div style={{ rowGap: "7px" }}>
      <button type="button" data-issue-id="A">
        A
      </button>
      <button type="button" data-issue-id="B">
        B
      </button>
      <BoardDropSlot beforeId="B" afterId="A" empty={false} reserveSpace />
      {additionalCard ? (
        <button type="button" data-issue-id="C">
          C
        </button>
      ) : null}
    </div>
  );
  const { unmount, rerender } = render(content());
  const first = screen.getByRole("button", { name: "A" });
  const second = screen.getByRole("button", { name: "B" });
  const parent = second.parentElement;
  expect(first.style.translate).toBe("");
  expect(second.style.translate).toBe("0 103px");
  expect(parent?.style.paddingBottom).toBe("103px");
  rerender(content(true));
  act(() => vi.advanceTimersByTime(20));
  const third = screen.getByRole("button", { name: "C" });
  expect(third.style.translate).toBe("0 103px");
  unmount();
  expect(second.style.translate).toBe("");
  expect(parent?.style.paddingBottom).toBe("");
  expect(third.style.translate).toBe("");
});
