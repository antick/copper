import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { applySchema, INDEX_SCHEMA_VERSION, schemaVersion } from "./schema";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("schema", () => {
  it("creates core tables and enables wal", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-schema-"));
    temps.push(dir);
    const db = new Database(path.join(dir, "index.db"));
    applySchema(db);
    const count = db
      .prepare(
        "SELECT count(*) as n FROM sqlite_master WHERE name IN ('files', 'headings', 'links', 'tags', 'fts_notes', 'tasks', 'task_labels', 'task_links')",
      )
      .get() as { n: number };
    expect(count.n).toBe(8);
    expect(schemaVersion(db)).toBe(INDEX_SCHEMA_VERSION);
    const mode = db.pragma("journal_mode", { simple: true });
    expect(String(mode).toLowerCase()).toBe("wal");
    db.close();
  });
});
