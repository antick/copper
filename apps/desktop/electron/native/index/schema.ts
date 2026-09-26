import type Database from "better-sqlite3";

export const INDEX_SCHEMA_VERSION = 2;

export const INITIAL_SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  parent_path TEXT,
  name TEXT NOT NULL,
  extension TEXT,
  size_bytes INTEGER NOT NULL,
  mtime_ns INTEGER NOT NULL,
  content_hash TEXT,
  title TEXT,
  frontmatter_json TEXT,
  indexed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS headings (
  file_path TEXT NOT NULL,
  level INTEGER NOT NULL,
  text TEXT NOT NULL,
  slug TEXT,
  line INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  source_path TEXT NOT NULL,
  target_raw TEXT NOT NULL,
  target_resolved_path TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  file_path TEXT NOT NULL,
  tag TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_notes USING fts5(
  path UNINDEXED,
  title,
  body
);

CREATE TABLE IF NOT EXISTS tasks (
  path TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  status TEXT,
  priority TEXT,
  project_id TEXT,
  due TEXT,
  rank TEXT,
  title TEXT,
  created TEXT,
  updated TEXT
);

CREATE TABLE IF NOT EXISTS task_labels (
  path TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_links (
  kind TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL
);
`;

export function schemaVersion(db: Database.Database): number {
  return Number(db.pragma("user_version", { simple: true }));
}

export function applySchema(db: Database.Database): void {
  db.exec(INITIAL_SCHEMA);
  db.pragma("journal_mode = WAL");
  db.pragma(`user_version = ${INDEX_SCHEMA_VERSION}`);
}
