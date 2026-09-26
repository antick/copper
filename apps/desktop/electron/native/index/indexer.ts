import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { parseFrontmatter } from "../markdown/frontmatter";
import { parseWikiLink } from "../markdown/links";
import { toPosix } from "../path";
import { openIndex } from "./db";

function openRecovering(dbPath: string): Database.Database {
  try {
    return openIndex(dbPath);
  } catch {
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore
    }
    return openIndex(dbPath);
  }
}

function isMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

function mtimeNs(filePath: string): number {
  return Math.trunc(fs.statSync(filePath).mtimeMs * 1_000_000);
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => (/[a-z0-9]/.test(ch) ? ch : "-"))
    .join("");
}

function extractWikiLinks(line: string): string[] {
  const out: string[] = [];
  let rest = line;
  while (true) {
    const start = rest.indexOf("[[");
    if (start < 0) break;
    rest = rest.slice(start + 2);
    const end = rest.indexOf("]]");
    if (end < 0) break;
    out.push(rest.slice(0, end));
    rest = rest.slice(end + 2);
  }
  return out;
}

function extractTags(line: string): string[] {
  return line
    .split(/\s+/)
    .filter(
      (part) =>
        part.startsWith("#") && part.length > 1 && !part.startsWith("##"),
    )
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean);
}

function deletePath(db: Database.Database, relative: string): void {
  db.prepare("DELETE FROM files WHERE path = ?").run(relative);
  db.prepare("DELETE FROM headings WHERE file_path = ?").run(relative);
  db.prepare("DELETE FROM links WHERE source_path = ?").run(relative);
  db.prepare("DELETE FROM tags WHERE file_path = ?").run(relative);
  db.prepare("DELETE FROM fts_notes WHERE path = ?").run(relative);
  db.prepare("DELETE FROM tasks WHERE path = ?").run(relative);
  db.prepare("DELETE FROM task_labels WHERE path = ?").run(relative);
}

function writeFileIndex(
  db: Database.Database,
  absolute: string,
  relative: string,
): void {
  const meta = fs.statSync(absolute);
  const source = fs.readFileSync(absolute, "utf8");
  const hash = crypto.createHash("sha256").update(source).digest("hex");
  let parsed: ReturnType<typeof parseFrontmatter>;
  try {
    parsed = parseFrontmatter(source);
  } catch {
    parsed = { raw: "", body: source, values: {} };
  }
  const titleFromFm = parsed.values.title;
  const heading = parsed.body.split("\n").find((line) => line.startsWith("# "));
  const title =
    (typeof titleFromFm === "string" && titleFromFm) ||
    heading?.replace(/^#\s+/, "") ||
    path.parse(relative).name;
  const parent = toPosix(path.posix.dirname(toPosix(relative)));
  const now = Math.floor(Date.now() / 1000);
  deletePath(db, relative);
  db.prepare(
    `INSERT INTO files (path, parent_path, name, extension, size_bytes, mtime_ns, content_hash, title, frontmatter_json, indexed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    relative,
    parent === "." ? "" : parent,
    path.basename(relative),
    path.extname(relative).slice(1) || null,
    meta.size,
    mtimeNs(absolute),
    hash,
    title,
    JSON.stringify(parsed.values),
    now,
  );
  db.prepare("INSERT INTO fts_notes (path, title, body) VALUES (?, ?, ?)").run(
    relative,
    title,
    parsed.body,
  );
  for (const [lineNo, line] of source.split("\n").entries()) {
    if (line.startsWith("#")) {
      const hashes = line.match(/^#+/)?.[0].length ?? 0;
      const text = line.slice(hashes).trim();
      if (text && hashes <= 6) {
        db.prepare(
          "INSERT INTO headings (file_path, level, text, slug, line) VALUES (?, ?, ?, ?, ?)",
        ).run(relative, hashes, text, slug(text), lineNo + 1);
      }
    }
    for (const cap of extractWikiLinks(line)) {
      const [note] = parseWikiLink(cap);
      db.prepare(
        "INSERT INTO links (source_path, target_raw, target_resolved_path) VALUES (?, ?, NULL)",
      ).run(relative, note);
    }
    for (const tag of extractTags(line)) {
      db.prepare("INSERT INTO tags (file_path, tag) VALUES (?, ?)").run(
        relative,
        tag,
      );
    }
  }
  const tags = parsed.values.tags;
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === "string") {
        db.prepare("INSERT INTO tags (file_path, tag) VALUES (?, ?)").run(
          relative,
          tag,
        );
      }
    }
  }
  upsertTaskRow(db, relative, parsed, title);
}

function upsertTaskRow(
  db: Database.Database,
  relative: string,
  parsed: ReturnType<typeof parseFrontmatter>,
  title: string,
): void {
  const type = parsed.values.type;
  if (type !== "issue" && type !== "project") {
    return;
  }
  const id =
    typeof parsed.values.id === "string" && parsed.values.id.length > 0
      ? parsed.values.id
      : path.parse(relative).name;
  const status =
    typeof parsed.values.status === "string" ? parsed.values.status : null;
  const priority =
    typeof parsed.values.priority === "string" ? parsed.values.priority : null;
  const projectId =
    typeof parsed.values.project === "string" ? parsed.values.project : null;
  const due = typeof parsed.values.due === "string" ? parsed.values.due : null;
  const rank =
    typeof parsed.values.rank === "string" ? parsed.values.rank : null;
  const created =
    typeof parsed.values.created === "string" ? parsed.values.created : null;
  const updated =
    typeof parsed.values.updated === "string" ? parsed.values.updated : null;
  db.prepare(
    `INSERT INTO tasks (path, kind, id, status, priority, project_id, due, rank, title, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    relative,
    type,
    id,
    status,
    priority,
    projectId,
    due,
    rank,
    title,
    created,
    updated,
  );
  const labels = parsed.values.labels;
  if (Array.isArray(labels)) {
    for (const label of labels) {
      if (typeof label === "string") {
        db.prepare("INSERT INTO task_labels (path, label) VALUES (?, ?)").run(
          relative,
          label,
        );
      }
    }
  }
}

function resolveTarget(
  files: Array<{ path: string; title: string }>,
  raw: string,
): string | undefined {
  const [note] = parseWikiLink(raw);
  const cleaned = note.trim().replaceAll("\\", "/");
  if (!cleaned) return undefined;
  const withMd =
    cleaned.endsWith(".md") || cleaned.endsWith(".markdown")
      ? cleaned
      : `${cleaned}.md`;
  return files.find(
    (file) =>
      file.path === cleaned ||
      file.path === withMd ||
      file.path.endsWith(`/${withMd}`) ||
      path.parse(file.path).name.toLowerCase() === cleaned.toLowerCase() ||
      file.title.toLowerCase() === cleaned.toLowerCase(),
  )?.path;
}

function resolveLinks(db: Database.Database): void {
  const files = db.prepare("SELECT path, title FROM files").all() as Array<{
    path: string;
    title: string;
  }>;
  files.sort((a, b) => a.path.localeCompare(b.path));
  const links = db
    .prepare("SELECT rowid as id, target_raw as targetRaw FROM links")
    .all() as Array<{ id: number; targetRaw: string }>;
  const update = db.prepare(
    "UPDATE links SET target_resolved_path = ? WHERE rowid = ?",
  );
  for (const link of links) {
    const resolved = resolveTarget(files, link.targetRaw);
    if (resolved) {
      update.run(resolved, link.id);
    }
  }
}

function indexDir(
  db: Database.Database,
  root: string,
  dir: string,
  existing: Map<string, { mtime: number; size: number }>,
  seen: Set<string>,
): number {
  let indexed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (name.startsWith(".") || name === "node_modules" || name === "target") {
      continue;
    }
    const absolute = path.join(dir, name);
    if (entry.isDirectory()) {
      indexed += indexDir(db, root, absolute, existing, seen);
      continue;
    }
    if (!isMarkdownPath(absolute)) {
      continue;
    }
    const relative = toPosix(path.relative(root, absolute));
    seen.add(relative);
    const meta = fs.statSync(absolute);
    const prior = existing.get(relative);
    if (
      prior &&
      prior.mtime === mtimeNs(absolute) &&
      prior.size === meta.size
    ) {
      continue;
    }
    writeFileIndex(db, absolute, relative);
    indexed += 1;
  }
  return indexed;
}

export function indexVault(dbPath: string, vaultRoot: string): number {
  const db = openRecovering(dbPath);
  try {
    const run = db.transaction(() => {
      const existing = new Map<string, { mtime: number; size: number }>();
      for (const row of db
        .prepare("SELECT path, mtime_ns, size_bytes FROM files")
        .all() as Array<{
        path: string;
        mtime_ns: number;
        size_bytes: number;
      }>) {
        existing.set(row.path, { mtime: row.mtime_ns, size: row.size_bytes });
      }
      const seen = new Set<string>();
      const indexed = indexDir(db, vaultRoot, vaultRoot, existing, seen);
      for (const filePath of existing.keys()) {
        if (!seen.has(filePath)) {
          deletePath(db, filePath);
        }
      }
      resolveLinks(db);
      return indexed;
    });
    return run();
  } finally {
    db.close();
  }
}

export function rebuildIndex(dbPath: string, vaultRoot: string): number {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  return indexVault(dbPath, vaultRoot);
}

export function indexFilePath(
  dbPath: string,
  vaultRoot: string,
  relative: string,
): void {
  const db = openRecovering(dbPath);
  try {
    db.transaction(() => {
      const absolute = path.join(vaultRoot, relative);
      if (
        fs.existsSync(absolute) &&
        fs.statSync(absolute).isFile() &&
        isMarkdownPath(absolute)
      ) {
        writeFileIndex(db, absolute, relative);
      } else {
        deletePath(db, relative);
      }
      resolveLinks(db);
    })();
  } finally {
    db.close();
  }
}

export function removeIndexedPath(dbPath: string, relative: string): void {
  const db = openRecovering(dbPath);
  try {
    db.transaction(() => {
      deletePath(db, relative);
    })();
  } finally {
    db.close();
  }
}
