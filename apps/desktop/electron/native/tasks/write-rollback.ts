import crypto from "node:crypto";
import fs from "node:fs";
import { saveFile } from "../files/service";
import { indexFilePath, removeIndexedPath } from "../index/indexer";
import { resolveInVault } from "../path";

export interface TaskWriteSnapshot {
  path: string;
  source: string;
  writtenHash: string;
}

export interface TaskCreationSnapshot {
  path: string;
  createdHash: string;
}

export function snapshotTaskCreation(
  path: string,
  contents: string,
): TaskCreationSnapshot {
  return {
    path,
    createdHash: crypto.createHash("sha256").update(contents).digest("hex"),
  };
}

export function rollbackTaskWrites(
  root: string,
  dbPath: string,
  writes: TaskWriteSnapshot[],
): void {
  for (const write of writes.toReversed()) {
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

export function rollbackTaskCreations(
  root: string,
  dbPath: string,
  creations: TaskCreationSnapshot[],
): void {
  for (const creation of creations.toReversed()) {
    let absolute: string;
    try {
      absolute = resolveInVault(root, creation.path);
    } catch {
      try {
        removeIndexedPath(dbPath, creation.path);
      } catch {
        // Preserve the original creation failure if index cleanup also fails.
      }
      continue;
    }

    try {
      if (fs.lstatSync(absolute).isFile()) {
        const contents = fs.readFileSync(absolute);
        const currentHash = crypto
          .createHash("sha256")
          .update(contents)
          .digest("hex");
        if (currentHash === creation.createdHash) {
          fs.unlinkSync(absolute);
        }
      }
    } catch {
      // Keep externally replaced, deleted, or unreadable files untouched.
    }

    try {
      if (fs.lstatSync(absolute).isFile()) {
        indexFilePath(dbPath, root, creation.path);
      } else {
        removeIndexedPath(dbPath, creation.path);
      }
    } catch {
      try {
        removeIndexedPath(dbPath, creation.path);
      } catch {
        // Preserve the original creation failure if index cleanup also fails.
      }
    }
  }
}
