import fs from "node:fs";
import { isArchivedPath } from "../../../shared/task-paths";
import {
  formatIssueId,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import { CopperError } from "../errors";
import { shouldIndexFile } from "../index/eligibility";
import {
  discoverTaskIdentities,
  taskIdentityFromSource,
} from "./task-discovery";

function identityIdForComparison(
  kind: "issue" | "project",
  id: string,
): string {
  if (kind !== "issue") return id;
  const parsed = parseIssueIdentifier(id);
  return parsed && parsed.sequence > 0
    ? formatIssueId(parsed.prefix, parsed.sequence)
    : id;
}

export function assertNoActiveTaskIdentityCollision(
  root: string,
  sourcePath: string,
  sourceAbsolute: string,
  destinationPath: string,
): void {
  if (isArchivedPath(destinationPath) || !shouldIndexFile(destinationPath)) {
    return;
  }

  const sourceIdentity = taskIdentityFromSource(
    sourcePath,
    fs.readFileSync(sourceAbsolute, "utf8"),
  );
  if (!sourceIdentity) return;

  const collision = discoverTaskIdentities(root).some(
    (task) =>
      !task.archived &&
      task.relative !== destinationPath &&
      task.kind === sourceIdentity.kind &&
      identityIdForComparison(task.kind, task.id) ===
        identityIdForComparison(sourceIdentity.kind, sourceIdentity.id),
  );
  if (!collision) return;

  throw CopperError.invalid(
    `Cannot restore ${sourceIdentity.kind} ${sourceIdentity.id} because it is already active`,
  );
}
