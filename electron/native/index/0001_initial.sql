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
