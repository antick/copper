import fs from "node:fs";
import { saveFile } from "../files/service";
import { indexFilePath, removeIndexedPath } from "../index/indexer";
import { resolveInVault } from "../path";

export interface TaskWriteSnapshot {
  path: string;
  source: string;
  writtenHash: string;
}

export function rollbackTaskWrites(
  root: string,
  dbPath: string,
  writes: TaskWriteSnapshot[],
): void {
  for (const write of [...writes].reverse()) {
    try {
      const absolute = resolveInVault(root, write.path);
      if (fs.existsSync(absolute)) {
        saveFile(root, write.path, write.source, write.writtenHash);
      }
    } catch {
      // A later edit or deletion belongs to the other writer; keep the original failure.
    }

    try {
      const absolute = resolveInVault(root, write.path);
      if (fs.existsSync(absolute)) {
        indexFilePath(dbPath, root, write.path);
      } else {
        removeIndexedPath(dbPath, write.path);
      }
    } catch {
      // Best-effort index refresh must not replace the original failure.
    }
  }
}
