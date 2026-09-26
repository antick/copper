import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { indexVault, rebuildIndex } from "./indexer";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("indexer", () => {
  it("rebuilds from markdown after db delete", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx-"));
    temps.push(dir);
    fs.writeFileSync(
      path.join(dir, "hello.md"),
      "# Hello\nSee [[Other]] #tag\n",
    );
    const db = path.join(dir, "index.db");
    expect(indexVault(db, dir)).toBe(1);
    fs.unlinkSync(db);
    expect(rebuildIndex(db, dir)).toBe(1);
  });

  it("skips unchanged files and drops deleted paths", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx2-"));
    temps.push(dir);
    fs.writeFileSync(path.join(dir, "keep.md"), "# Keep\n");
    fs.writeFileSync(path.join(dir, "gone.md"), "# Gone\n");
    const db = path.join(dir, "index.db");
    expect(indexVault(db, dir)).toBe(2);
    expect(indexVault(db, dir)).toBe(0);
    fs.unlinkSync(path.join(dir, "gone.md"));
    indexVault(db, dir);
    const connection = new Database(db);
    const count = connection
      .prepare("SELECT count(*) as n FROM files")
      .get() as {
      n: number;
    };
    connection.close();
    expect(count.n).toBe(1);
  });

  it("indexes issue and project frontmatter but not unmarked Tasks files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx-tasks-"));
    temps.push(dir);
    fs.mkdirSync(path.join(dir, "Tasks", "Issues"), { recursive: true });
    fs.mkdirSync(path.join(dir, "Tasks", "Projects"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "Tasks", "Issues", "COPP-1-board.md"),
      "---\ntype: issue\nid: COPP-1\nstatus: todo\npriority: none\nrank: V\nlabels:\n  - ui\n---\n# Board\n",
    );
    fs.writeFileSync(
      path.join(dir, "Tasks", "Projects", "copper.md"),
      "---\ntype: project\nid: copper\nstatus: started\n---\n# Copper\n",
    );
    fs.writeFileSync(
      path.join(dir, "Tasks", "Issues", "meeting.md"),
      "# Meeting\nOrdinary note.\n",
    );
    const dbPath = path.join(dir, "index.db");
    expect(indexVault(dbPath, dir)).toBe(3);
    const connection = new Database(dbPath);
    const tasks = connection
      .prepare("SELECT id, kind FROM tasks ORDER BY id")
      .all() as Array<{ id: string; kind: string }>;
    const files = connection
      .prepare("SELECT count(*) as n FROM files")
      .get() as { n: number };
    const fts = connection
      .prepare("SELECT count(*) as n FROM fts_notes")
      .get() as { n: number };
    connection.close();
    expect(tasks).toEqual([
      { id: "COPP-1", kind: "issue" },
      { id: "copper", kind: "project" },
    ]);
    expect(files.n).toBe(3);
    expect(fts.n).toBe(3);
  });
});
