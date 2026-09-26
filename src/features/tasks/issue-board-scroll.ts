type BoardScrollMetrics = Pick<
  HTMLElement,
  "scrollLeft" | "scrollWidth" | "clientWidth"
>;

type BoardWheelInput = Pick<
  WheelEvent,
  "deltaX" | "deltaY" | "shiftKey" | "ctrlKey"
>;

export function boardHorizontalWheelDelta(event: BoardWheelInput): number {
  if (event.ctrlKey) return 0;
  if (event.shiftKey) return event.deltaX + event.deltaY;
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return event.deltaX;
  return 0;
}

export function applyBoardHorizontalScroll(
  board: BoardScrollMetrics,
  delta: number,
): boolean {
  if (delta === 0) return false;
  const max = Math.max(0, board.scrollWidth - board.clientWidth);
  if (max <= 0) return false;
  const next = Math.min(max, Math.max(0, board.scrollLeft + delta));
  if (next === board.scrollLeft) return false;
  board.scrollLeft = next;
  return true;
}

export function attachBoardHorizontalWheel(board: HTMLElement): () => void {
  const onWheel = (event: WheelEvent) => {
    if (applyBoardHorizontalScroll(board, boardHorizontalWheelDelta(event))) {
      event.preventDefault();
    }
  };
  board.addEventListener("wheel", onWheel, { capture: true, passive: false });
  return () => {
    board.removeEventListener("wheel", onWheel, { capture: true });
  };
}
