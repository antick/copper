import { describe, expect, it, vi } from "vitest";
import {
  applyBoardHorizontalScroll,
  attachBoardHorizontalWheel,
  boardHorizontalWheelDelta,
} from "@/features/tasks/issue-board-scroll";

function overflowingBoard(scrollLeft = 0) {
  return {
    scrollLeft,
    scrollWidth: 1800,
    clientWidth: 700,
  };
}

describe("board horizontal wheel", () => {
  it("maps Shift-wheel and dominant horizontal deltas", () => {
    expect(
      boardHorizontalWheelDelta({
        deltaX: 0,
        deltaY: 120,
        shiftKey: true,
        ctrlKey: false,
      }),
    ).toBe(120);
    expect(
      boardHorizontalWheelDelta({
        deltaX: 80,
        deltaY: 12,
        shiftKey: false,
        ctrlKey: false,
      }),
    ).toBe(80);
    expect(
      boardHorizontalWheelDelta({
        deltaX: 8,
        deltaY: 90,
        shiftKey: false,
        ctrlKey: false,
      }),
    ).toBe(0);
    expect(
      boardHorizontalWheelDelta({
        deltaX: 40,
        deltaY: 0,
        shiftKey: false,
        ctrlKey: true,
      }),
    ).toBe(0);
  });

  it("applies deltas only while the board can actually overflow", () => {
    const board = overflowingBoard();
    expect(applyBoardHorizontalScroll(board, 90)).toBe(true);
    expect(board.scrollLeft).toBe(90);
    expect(applyBoardHorizontalScroll(board, 0)).toBe(false);
    expect(
      applyBoardHorizontalScroll(
        { scrollLeft: 0, scrollWidth: 700, clientWidth: 700 },
        40,
      ),
    ).toBe(false);
    expect(applyBoardHorizontalScroll(overflowingBoard(1800 - 700), 40)).toBe(
      false,
    );
  });

  it("captures nested lane wheels with a non-passive listener", () => {
    const board = document.createElement("div");
    const lane = document.createElement("div");
    board.append(lane);
    document.body.append(board);
    Object.defineProperty(board, "scrollWidth", {
      configurable: true,
      value: 1800,
    });
    Object.defineProperty(board, "clientWidth", {
      configurable: true,
      value: 700,
    });
    board.scrollLeft = 0;
    const add = vi.spyOn(board, "addEventListener");
    const stop = attachBoardHorizontalWheel(board);
    expect(add).toHaveBeenCalledWith(
      "wheel",
      expect.any(Function),
      expect.objectContaining({ capture: true, passive: false }),
    );

    const horizontal = new WheelEvent("wheel", {
      deltaX: 80,
      deltaY: 10,
      bubbles: true,
      cancelable: true,
    });
    expect(lane.dispatchEvent(horizontal)).toBe(false);
    expect(board.scrollLeft).toBe(80);

    const shiftWheel = new WheelEvent("wheel", {
      deltaX: 0,
      deltaY: 40,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(lane.dispatchEvent(shiftWheel)).toBe(false);
    expect(board.scrollLeft).toBe(120);

    const vertical = new WheelEvent("wheel", {
      deltaX: 4,
      deltaY: 70,
      bubbles: true,
      cancelable: true,
    });
    expect(lane.dispatchEvent(vertical)).toBe(true);
    expect(board.scrollLeft).toBe(120);

    stop();
    board.remove();
  });
});
