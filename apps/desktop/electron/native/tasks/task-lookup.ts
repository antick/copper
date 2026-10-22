import {
  formatIssueId,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import { CopperError } from "../errors";
import { discoverTaskIdentities, type TaskKind } from "./task-discovery";

function identityIdForComparison(kind: TaskKind, id: string): string {
  if (kind !== "issue") return id;
  const parsed = parseIssueIdentifier(id);
  return parsed && parsed.sequence > 0
    ? formatIssueId(parsed.prefix, parsed.sequence)
    : id;
}

export function sameTaskIdentity(
  kind: TaskKind,
  left: string,
  right: string,
): boolean {
  return (
    identityIdForComparison(kind, left) === identityIdForComparison(kind, right)
  );
}

export function findTaskPath(
  root: string,
  kind: TaskKind,
  id: string,
  options: { includeArchived?: boolean } = {},
): string {
  const discovered = discoverTaskIdentities(root).filter(
    (task) => task.kind === kind,
  );
  const active = discovered.filter((task) => !task.archived);
  const groups = options.includeArchived
    ? [active, discovered.filter((task) => task.archived)]
    : [active];
  for (const tasks of groups) {
    const match =
      tasks.find((task) => task.id === id) ??
      tasks.find((task) => sameTaskIdentity(kind, task.id, id));
    if (match) return match.relative;
  }

  const label = kind === "issue" ? "Issue" : "Project";
  throw CopperError.notFound(`${label} ${id} was not found`);
}
