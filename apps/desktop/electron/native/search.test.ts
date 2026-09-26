import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { indexVault } from "./index/indexer";
import { notesInFolder, searchNotes } from "./search";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("search", () => {
  it("matches title body and tag text without leaking archive", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-search-"));
    temps.push(dir);
    fs.writeFileSync(
      path.join(dir, "alpha.md"),
      "# Copper\nbody search token\n#research\n",
    );
    fs.mkdirSync(path.join(dir, "Archive/Projects"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "Archive/Projects/old.md"),
      "# Archived Copper\nsecret token\n",
    );
    fs.writeFileSync(path.join(dir, "source.ts"), "const token = 'Copper';");
    const db = path.join(dir, "index.db");
    indexVault(db, dir);
    const hits = searchNotes(db, "Copper");
    expect(hits.map((hit) => hit.path)).toEqual(["alpha.md"]);
    expect(searchNotes(db, "token")).toHaveLength(1);
    expect(searchNotes(db, "research")).toHaveLength(1);
    expect(notesInFolder(db, "")).toHaveLength(1);
    const archivedSearch = searchNotes(db, "Copper", true);
    expect(archivedSearch).toHaveLength(1);
    expect(archivedSearch[0]?.path).toBe("Archive/Projects/old.md");
    const archived = notesInFolder(db, "Archive");
    expect(archived).toHaveLength(1);
    expect(archived[0]?.path).toBe("Archive/Projects/old.md");
  });
});
