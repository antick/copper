import {
  type Collision,
  type CollisionDetection,
  closestCorners,
  type KeyboardCoordinateGetter,
  pointerWithin,
} from "@dnd-kit/core";
import {
  type AnimateLayoutChanges,
  defaultAnimateLayoutChanges,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { IssueStatus, TaskIssue } from "@/lib/copper/tasks";

export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  args,
) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight")
    return sortableKeyboardCoordinates(event, args);
  event.preventDefault();
  const collisionRect = args.context.collisionRect;
  const currentStatus = args.context.active?.data.current?.status;
  if (!collisionRect || typeof currentStatus !== "string") return;
  const lanes = args.context.droppableContainers
    .getEnabled()
    .flatMap((container) => {
      const rect = args.context.droppableRects.get(container.id);
      return container.data.current?.type === "issue-lane" && rect
        ? [{ rect, status: String(container.data.current.status) }]
        : [];
    })
    .sort((left, right) => left.rect.left - right.rect.left);
  const current = lanes.findIndex(({ status }) => status === currentStatus);
  const target = lanes[current + (event.code === "ArrowRight" ? 1 : -1)];
  if (!target) return;
  return {
    x: target.rect.left + (target.rect.width - collisionRect.width) / 2,
    y: Math.min(
      Math.max(args.currentCoordinates.y, target.rect.top),
      target.rect.bottom - collisionRect.height,
    ),
  };
};

export const boardCardAnimateLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.isSorting || args.wasDragging) return false;
  return defaultAnimateLayoutChanges(args);
};

function droppableType(
  containers: { id: Collision["id"]; data: { current?: { type?: unknown } } }[],
  id: Collision["id"],
) {
  return containers.find((container) => container.id === id)?.data.current
    ?.type;
}

export function resolveIssueCollisions(
  pointerHits: Collision[],
  args: Parameters<CollisionDetection>[0],
): Collision[] {
  const cardHits = pointerHits.filter(
    ({ id }) => droppableType(args.droppableContainers, id) === "issue",
  );
  if (cardHits.length) return cardHits;
  const laneHits = pointerHits.filter(
    ({ id }) => droppableType(args.droppableContainers, id) === "issue-lane",
  );
  const lane = laneHits[0];
  if (!lane) return pointerHits;
  const status = String(lane.id).startsWith("column:")
    ? String(lane.id).slice("column:".length)
    : String(lane.id);
  const cards = args.droppableContainers.filter(
    (container) =>
      container.data.current?.type === "issue" &&
      container.data.current?.status === status,
  );
  if (!cards.length) return laneHits;
  return closestCorners({ ...args, droppableContainers: cards });
}

export const boardCollisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;
  const allowed =
    activeType === "workflow-column"
      ? new Set(["workflow-column"])
      : new Set(["issue", "issue-lane"]);
  const droppableContainers = args.droppableContainers.filter((container) =>
    allowed.has(String(container.data.current?.type)),
  );
  const scoped = { ...args, droppableContainers };
  if (activeType === "issue") {
    const resolved = resolveIssueCollisions(pointerWithin(scoped), scoped);
    if (resolved.length) return resolved;
  }
  return closestCorners(scoped);
};

export function moveInputForDrop(
  issues: TaskIssue[],
  id: string,
  over: string,
): {
  status: IssueStatus;
  afterId?: string | null;
  beforeId?: string | null;
} | null {
  if (id === over) return null;
  const status = over.startsWith("column:")
    ? over.slice(7)
    : over.startsWith("workflow:")
      ? over.slice(9)
      : issues.find((issue) => issue.id === over)?.status;
  if (!status) return null;
  const column = issues.filter(
    (issue) => issue.status === status && issue.id !== id,
  );
  if (over.startsWith("column:") || over.startsWith("workflow:")) {
    return { status, afterId: column.at(-1)?.id ?? null };
  }
  const source = issues.filter((issue) => issue.status === status);
  const activeIndex = source.findIndex((issue) => issue.id === id);
  const targetIndex = source.findIndex((issue) => issue.id === over);
  if (activeIndex >= 0 && activeIndex < targetIndex) {
    return { status, afterId: over };
  }
  const overIndex = column.findIndex((issue) => issue.id === over);
  return {
    status,
    afterId: column[overIndex - 1]?.id ?? null,
    beforeId: column[overIndex]?.id ?? null,
  };
}

export function boardDropSlot(
  issues: TaskIssue[],
  activeId: string | null,
  overId: string | null,
): {
  status: IssueStatus;
  beforeId: string | null;
  afterId: string | null;
} | null {
  if (!activeId || !overId || activeId.startsWith("workflow:")) return null;
  const input = moveInputForDrop(issues, activeId, overId);
  if (!input) return null;
  return {
    status: input.status,
    beforeId: input.beforeId ?? null,
    afterId: input.afterId ?? null,
  };
}
