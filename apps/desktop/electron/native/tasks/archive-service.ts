import { ARCHIVE_DIR, TASK_ARCHIVE_DIR } from "../../../shared/task-paths";

export { isArchivedPath as isArchivedTaskSourcePath } from "../../../shared/task-paths";

export function activeTaskArchivePatterns(): [string, string] {
  return [`${ARCHIVE_DIR}/%`, `${TASK_ARCHIVE_DIR}/%`];
}
