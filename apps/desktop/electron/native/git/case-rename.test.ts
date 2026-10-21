import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { indexFilePath, indexVault } from "../index/indexer";
import { gitSetup, makeLinkedClones } from "./git-fixture";
import { publishGitVault } from "./index";

const temps: string[] = [];

function supportsCaseInsensitiveLookup(): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-case-check-"));
  const original = path.join(dir, "CaseCheck.md");
  try {
    fs.writeFileSync(original, "probe");
    return fs.existsSync(path.join(dir, "casecheck.md"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const caseInsensitiveVolume = supportsCaseInsensitiveLookup();

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("case-only Git renames", () => {
  it.skipIf(!caseInsensitiveVolume)(
    "keeps only the real path after publishing a remote case-only rename",
    async () => {
      const { local, remote, bare } = makeLinkedClones();
      const parent = path.dirname(bare);
      temps.push(parent);

      const db = path.join(parent, "index.db");
      indexVault(db, local);
      gitSetup(remote, ["mv", "-f", "README.md", "readme.md"]);
      gitSetup(remote, ["commit", "-m", "case-only rename"]);
      gitSetup(remote, ["push"]);

      const result = await publishGitVault(local);
      expect(result.kind).toBe("updated");
      if (result.kind !== "updated") return;
      expect(result.changedPaths).toEqual(
        expect.arrayContaining(["README.md", "readme.md"]),
      );

      for (const changedPath of [
        ...result.changedPaths,
        ...result.siblingPaths,
      ]) {
        indexFilePath(db, local, changedPath);
      }

      const connection = new Database(db);
      const indexedPaths = connection
        .prepare("SELECT path FROM files ORDER BY path")
        .all() as Array<{ path: string }>;
      connection.close();
      expect(indexedPaths).toEqual([{ path: "readme.md" }]);
    },
  );

  it.skipIf(!caseInsensitiveVolume)(
    "uses the real directory entry casing after a case-only directory rename",
    () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-dir-case-"));
      temps.push(root);
      const oldDirectory = path.join(root, "Projects");
      const temporaryDirectory = path.join(root, "case-rename-temp");
      const newDirectory = path.join(root, "projects");
      fs.mkdirSync(oldDirectory);
      fs.writeFileSync(path.join(oldDirectory, "README.md"), "# Readme\n");
      const db = path.join(root, "index.db");

      expect(indexVault(db, root)).toBe(1);
      fs.renameSync(oldDirectory, temporaryDirectory);
      fs.renameSync(temporaryDirectory, newDirectory);
      indexFilePath(db, root, "Projects/README.md");
      indexFilePath(db, root, "projects/README.md");

      const connection = new Database(db);
      const indexedPaths = connection
        .prepare("SELECT path FROM files ORDER BY path")
        .all() as Array<{ path: string }>;
      connection.close();
      expect(indexedPaths).toEqual([{ path: "projects/README.md" }]);
    },
  );
});
