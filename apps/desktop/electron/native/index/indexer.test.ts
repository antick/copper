import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { indexFilePath, indexVault, rebuildIndex } from "./indexer";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("indexer", () => {
  it("indexes a filesystem-resolved file under its actual path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx-alias-"));
    temps.push(dir);
    fs.mkdirSync(path.join(dir, "real"));
    fs.writeFileSync(path.join(dir, "real", "readme.md"), "# Readme\n");
    fs.symlinkSync(
      path.join(dir, "real"),
      path.join(dir, "legacy-name"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const db = path.join(dir, "index.db");

    expect(indexVault(db, dir)).toBe(1);
    indexFilePath(db, dir, "legacy-name/readme.md");

    const connection = new Database(db);
    const indexedPaths = connection
      .prepare("SELECT path FROM files ORDER BY path")
      .all() as Array<{ path: string }>;
    connection.close();
    expect(indexedPaths).toEqual([{ path: "real/readme.md" }]);
  });

  it("does not incrementally index a hidden target skipped by a full walk", () => {
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "copper-idx-hidden-link-"),
    );
    temps.push(dir);
    fs.mkdirSync(path.join(dir, ".hidden"));
    fs.writeFileSync(path.join(dir, ".hidden", "note.md"), "# Hidden\n");
    fs.symlinkSync(
      path.join(dir, ".hidden"),
      path.join(dir, "visible-alias"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const db = path.join(dir, "index.db");

    expect(indexVault(db, dir)).toBe(0);
    indexFilePath(db, dir, "visible-alias/note.md");

    const connection = new Database(db);
    const indexedPaths = connection
      .prepare("SELECT path FROM files ORDER BY path")
      .all() as Array<{ path: string }>;
    connection.close();
    expect(indexedPaths).toEqual([]);
  });

  it("does not index Markdown aliases to non-Markdown targets", (context) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx-file-link-"));
    temps.push(dir);
    const aliases = [
      ["plain.txt", "plain.md"],
      ["attachment.png", "attachment.md"],
    ];
    for (const [target, alias] of aliases) {
      fs.writeFileSync(path.join(dir, target), "not a Markdown note");
      try {
        fs.symlinkSync(path.join(dir, target), path.join(dir, alias), "file");
      } catch (error) {
        if (
          ["EACCES", "EPERM", "ENOTSUP"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        ) {
          context.skip();
          return;
        }
        throw error;
      }
    }

    const db = path.join(dir, "index.db");
    expect(indexVault(db, dir)).toBe(0);
    for (const [, alias] of aliases) {
      indexFilePath(db, dir, alias);
    }

    const connection = new Database(db);
    const indexedPaths = connection
      .prepare("SELECT path FROM files ORDER BY path")
      .all() as Array<{ path: string }>;
    connection.close();
    expect(indexedPaths).toEqual([]);
  });

  it("preserves distinct case and Unicode names on filesystems that support them", (context) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx-names-"));
    temps.push(dir);
    const names = ["README.md", "readme.md", "café.md", "cafe\u0301.md"];
    for (const [index, name] of names.entries()) {
      fs.writeFileSync(path.join(dir, name), `# Note ${index}\n`);
    }
    const entries = new Set(fs.readdirSync(dir));
    if (!names.every((name) => entries.has(name))) {
      context.skip();
      return;
    }

    const db = path.join(dir, "index.db");
    expect(indexVault(db, dir)).toBe(names.length);
    for (const name of names) {
      indexFilePath(db, dir, name);
    }

    const connection = new Database(db);
    const indexedPaths = connection
      .prepare("SELECT path FROM files ORDER BY path")
      .all() as Array<{ path: string }>;
    connection.close();
    expect(indexedPaths.map(({ path: filePath }) => filePath).sort()).toEqual(
      names.sort(),
    );
  });

  it("keeps the directory entry spelling for Unicode-normalized aliases", (context) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-idx-unicode-"));
    temps.push(dir);
    const actualName = "cafe\u0301.md";
    const aliasName = "café.md";
    fs.writeFileSync(path.join(dir, actualName), "# Café\n");
    if (!fs.existsSync(path.join(dir, aliasName))) {
      context.skip();
      return;
    }

    const db = path.join(dir, "index.db");
    expect(indexVault(db, dir)).toBe(1);
    indexFilePath(db, dir, aliasName);

    const connection = new Database(db);
    const indexedPaths = connection
      .prepare("SELECT path FROM files ORDER BY path")
      .all() as Array<{ path: string }>;
    connection.close();
    expect(indexedPaths).toEqual([{ path: actualName }]);
  });

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
