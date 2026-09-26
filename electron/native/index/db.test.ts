import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openIndex } from "./db";
import { INDEX_SCHEMA_VERSION, schemaVersion } from "./schema";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("openIndex", () => {
  it("rebuilds when user_version does not match", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-db-"));
    temps.push(dir);
    const dbPath = path.join(dir, "index.db");
    const stale = new Database(dbPath);
    stale.exec("CREATE TABLE leftover (id INTEGER)");
    stale.pragma("user_version = 1");
    stale.close();
    const db = openIndex(dbPath);
    expect(schemaVersion(db)).toBe(INDEX_SCHEMA_VERSION);
    const leftover = db
      .prepare(
        "SELECT count(*) as n FROM sqlite_master WHERE name = 'leftover'",
      )
      .get() as { n: number };
    expect(leftover.n).toBe(0);
    db.close();
  });

  it("creates tasks tables at schema version 2", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-db-tasks-"));
    temps.push(dir);
    const db = openIndex(path.join(dir, "index.db"));
    const names = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
    expect(INDEX_SCHEMA_VERSION).toBe(2);
    expect(schemaVersion(db)).toBe(2);
    expect(names).toEqual(
      expect.arrayContaining(["tasks", "task_labels", "task_links"]),
    );
    db.close();
  });
});
