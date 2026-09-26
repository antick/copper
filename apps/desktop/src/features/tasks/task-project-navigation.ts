import { normalizeOrderedIds } from "@/lib/copper/task-settings";
import type { TaskProject } from "@/lib/copper/tasks";

export function normalizeProjectNavigation(
  projects: TaskProject[],
  order: readonly string[],
  pinned: readonly string[],
) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const ids = projects.map(({ id }) => id);
  const projectOrder = normalizeOrderedIds(order, ids);
  const pinnedProjects = normalizeOrderedIds(pinned).filter((id) =>
    byId.has(id),
  );
  return {
    projects: projectOrder.flatMap((id) => {
      const project = byId.get(id);
      return project ? [project] : [];
    }),
    projectOrder,
    pinnedProjects,
  };
}

export function sameIds(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

export function reorderProjectIds(
  ids: readonly string[],
  fromId: string,
  toId: string,
) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(to, 0, moved);
  return next;
}
