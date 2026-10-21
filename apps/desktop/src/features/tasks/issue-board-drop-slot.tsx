import { useLayoutEffect, useRef } from "react";

export function dropSlotHeightPx(
  parent: HTMLElement,
  preferred?: Element | null,
) {
  const candidates = [
    parent.querySelector("[data-dragging='true']"),
    parent
      .closest(".copper-task-board")
      ?.querySelector("[data-dragging='true']"),
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
  space?: {
    padding: number;
    height: string;
    translations: Map<HTMLElement, string>;
  },
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
  const gap = Number.parseFloat(getComputedStyle(parent).rowGap) || 0;
  const height =
    slot.getBoundingClientRect().height ||
    Number.parseFloat(getComputedStyle(slot).minHeight) ||
    0;
  if (space) {
    const offset = height + gap;
    const cards = [...parent.querySelectorAll<HTMLElement>("[data-issue-id]")];
    const targetIndex = cards.indexOf(card) + (beforeId ? 0 : 1);
    // Leave sortable transforms intact while making room in the destination.
    for (const [index, neighbor] of cards.entries()) {
      if (!space.translations.has(neighbor)) {
        space.translations.set(neighbor, neighbor.style.translate);
      }
      neighbor.style.translate = index >= targetIndex ? `0 ${offset}px` : "";
    }
    parent.style.paddingBottom = `${space.padding + offset}px`;
    if (space.height)
      parent.style.height = `calc(${space.height} + ${offset}px)`;
  }
  const parentBox = parent.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const top = beforeId
    ? cardBox.top - parentBox.top - height - gap
    : cardBox.bottom - parentBox.top + gap;
  slot.style.top = `${top}px`;
}

export function BoardDropSlot({
  beforeId,
  afterId,
  empty,
  reserveSpace = false,
}: {
  beforeId: string | null;
  afterId: string | null;
  empty: boolean;
  reserveSpace?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const slot = ref.current;
    const parent = slot?.parentElement;
    if (!slot || !parent) return;
    const paddingBottom = parent.style.paddingBottom;
    const height = parent.style.height;
    const space = reserveSpace
      ? {
          padding:
            Number.parseFloat(getComputedStyle(parent).paddingBottom) || 0,
          height,
          translations: new Map<HTMLElement, string>(),
        }
      : undefined;
    let frame = 0;
    const update = () => {
      positionDropSlot(slot, beforeId, afterId, empty, space);
      frame = requestAnimationFrame(update);
    };
    update();
    return () => {
      cancelAnimationFrame(frame);
      if (!space) return;
      parent.style.paddingBottom = paddingBottom;
      parent.style.height = height;
      for (const [node, translate] of space.translations)
        node.style.translate = translate;
    };
  }, [afterId, beforeId, empty, reserveSpace]);
  return (
    <div
      ref={ref}
      className="copper-task-drop-slot"
      data-empty={empty || undefined}
      aria-hidden="true"
    />
  );
}
