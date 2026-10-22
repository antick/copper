import fs from "node:fs";
import { isArchivedPath } from "../../../shared/task-paths";
import { CopperError } from "../errors";
import { shouldIndexFile } from "../index/eligibility";
import {
  discoverTaskIdentities,
  taskIdentityFromSource,
} from "./task-discovery";
import { sameTaskIdentity } from "./task-lookup";

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
      sameTaskIdentity(task.kind, task.id, sourceIdentity.id),
  );
  if (!collision) return;

  throw CopperError.invalid(
    `Cannot restore ${sourceIdentity.kind} ${sourceIdentity.id} because it is already active`,
  );
}
