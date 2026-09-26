import path from "node:path";
import { openIndex } from "./index/db";

export interface Backlink {
  sourcePath: string;
  targetRaw: string;
}

export function backlinksFor(dbPath: string, filePath: string): Backlink[] {
  const db = openIndex(dbPath);
  try {
    const stem = path.parse(filePath).name || filePath;
    const headingLike = `${stem}#%`;
    return db
      .prepare(
        `SELECT DISTINCT source_path as sourcePath, target_raw as targetRaw FROM links
         WHERE target_resolved_path = ?
            OR target_raw = ?
            OR target_raw = ?
            OR target_raw LIKE ?`,
      )
      .all(filePath, filePath, stem, headingLike) as Backlink[];
  } finally {
    db.close();
  }
}
