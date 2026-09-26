import { openIndex } from "./index/db";

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
  tags: string[];
  mtimeNs: number;
}

function ftsQuery(query: string): string {
  return query
    .split(/\s+/)
    .map((token) => {
      const cleaned = [...token]
        .filter((ch) => /[a-zA-Z0-9_-]/.test(ch))
        .join("");
      return cleaned ? `${cleaned}*` : "";
    })
    .filter(Boolean)
    .join(" OR ");
}

function tagsFor(db: ReturnType<typeof openIndex>, filePath: string): string[] {
  return db
    .prepare("SELECT DISTINCT tag FROM tags WHERE file_path = ?")
    .all(filePath)
    .map((row) => (row as { tag: string }).tag);
}

export function searchNotes(
  dbPath: string,
  query: string,
  archiveOnly = false,
): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const db = openIndex(dbPath);
  try {
    const archiveFilter = archiveOnly
      ? "path LIKE 'Archive/%'"
      : "path NOT LIKE 'Archive/%'";
    const parts: Array<[string, string, string]> = [];
    const fts = ftsQuery(trimmed);
    if (fts) {
      const rows = db
        .prepare(
          `SELECT path, title, snippet(fts_notes, 2, '', '', '…', 12) AS snippet
           FROM fts_notes
           WHERE fts_notes MATCH ?
             AND ${archiveFilter}
           ORDER BY rank
           LIMIT 200`,
        )
        .all(fts) as Array<{ path: string; title: string; snippet: string }>;
      for (const row of rows) {
        parts.push([row.path, row.title, row.snippet ?? ""]);
      }
    }
    const like = `%${trimmed}%`;
    const fileFilter = archiveOnly
      ? "path LIKE 'Archive/%'"
      : "path NOT LIKE 'Archive/%'";
    const tagFilter = archiveOnly
      ? "file_path LIKE 'Archive/%'"
      : "file_path NOT LIKE 'Archive/%'";
    const extra = db
      .prepare(
        `SELECT path, title FROM files
         WHERE (path LIKE ? OR title LIKE ?) AND ${fileFilter}
         UNION
         SELECT file_path, file_path FROM tags
         WHERE tag LIKE ? AND ${tagFilter}
         LIMIT 200`,
      )
      .all(like, like, like) as Array<{ path: string; title: string }>;
    for (const row of extra) {
      if (!parts.some(([p]) => p === row.path)) {
        parts.push([row.path, row.title, ""]);
      }
    }
    return parts.map(([filePath, title, snippet]) => {
      const mtime = db
        .prepare("SELECT mtime_ns FROM files WHERE path = ?")
        .get(filePath) as { mtime_ns: number } | undefined;
      return {
        path: filePath,
        title,
        snippet,
        tags: tagsFor(db, filePath),
        mtimeNs: mtime?.mtime_ns ?? 0,
      };
    });
  } finally {
    db.close();
  }
}

export function notesInFolder(dbPath: string, folder: string): SearchHit[] {
  const db = openIndex(dbPath);
  try {
    let sql: string;
    const params: string[] = [];
    if (!folder || folder === "all") {
      sql = "f.path NOT LIKE 'Archive/%'";
    } else if (folder === "Archive") {
      sql = "f.path LIKE ? || '/%'";
      params.push("Archive");
    } else {
      sql =
        "(f.parent_path = ? OR f.path LIKE ? || '/%') AND f.path NOT LIKE 'Archive/%'";
      params.push(folder, folder);
    }
    const rows = db
      .prepare(
        `SELECT f.path, f.title, COALESCE(substr(n.body, 1, 140), '') as snippet, f.mtime_ns
         FROM files f
         LEFT JOIN fts_notes n ON n.path = f.path
         WHERE ${sql}
         ORDER BY f.mtime_ns DESC
         LIMIT 500`,
      )
      .all(...params) as Array<{
      path: string;
      title: string;
      snippet: string;
      mtime_ns: number;
    }>;
    return rows.map((row) => ({
      path: row.path,
      title: row.title,
      snippet: row.snippet,
      tags: tagsFor(db, row.path),
      mtimeNs: row.mtime_ns,
    }));
  } finally {
    db.close();
  }
}
