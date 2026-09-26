import { useLayoutEffect, useRef } from "react";

export function dropSlotHeightPx(
  parent: HTMLElement,
  preferred?: Element | null,
) {
  const candidates = [
    parent.querySelector("[data-dragging='true']"),
    preferred,
    parent.closest(".copper-task-board")?.querySelector(".copper-task-card"),
  ];
  for (const node of candidates) {
    if (!(node instanceof HTMLElement)) continue;
    const height = node.getBoundingClientRect().height;
    if (height > 0) return height;
  }
  return 0;
}

function applyDropSlotHeight(
  slot: HTMLDivElement,
  parent: HTMLElement,
  preferred?: Element | null,
) {
  const height = dropSlotHeightPx(parent, preferred);
  if (height) slot.style.height = `${height}px`;
}

function positionDropSlot(
  slot: HTMLDivElement,
  beforeId: string | null,
  afterId: string | null,
  empty: boolean,
) {
  const parent = slot.parentElement;
  if (!parent) return;
  if (empty) {
    applyDropSlotHeight(slot, parent);
    slot.style.position = "relative";
    slot.style.inset = "auto";
    slot.style.top = "0px";
    slot.style.left = "0px";
    slot.style.right = "0px";
    return;
  }
  slot.style.position = "absolute";
  slot.style.left = "0px";
  slot.style.right = "0px";
  const targetId = beforeId ?? afterId;
  const card = targetId
    ? parent.querySelector(`[data-issue-id="${CSS.escape(targetId)}"]`)
    : null;
  if (!(card instanceof HTMLElement)) return;
  applyDropSlotHeight(slot, parent, card);
  const parentBox = parent.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const gap = Number.parseFloat(getComputedStyle(parent).rowGap) || 0;
  const height =
    slot.getBoundingClientRect().height ||
    Number.parseFloat(getComputedStyle(slot).minHeight) ||
    0;
  const top = beforeId
    ? cardBox.top - parentBox.top - height - gap
    : cardBox.bottom - parentBox.top + gap;
  slot.style.top = `${top}px`;
}

export function BoardDropSlot({
  beforeId,
  afterId,
  empty,
}: {
  beforeId: string | null;
  afterId: string | null;
  empty: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const slot = ref.current;
    if (!slot) return;
    let frame = 0;
    const update = () => {
      positionDropSlot(slot, beforeId, afterId, empty);
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [afterId, beforeId, empty]);
  return (
    <div
      ref={ref}
      className="copper-task-drop-slot"
      data-empty={empty || undefined}
      aria-hidden="true"
    />
  );
}
