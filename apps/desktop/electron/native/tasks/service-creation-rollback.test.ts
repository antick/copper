import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createIssue, listIssues, updateIssue } from "./service";

const mocks = vi.hoisted(() => ({
  afterIndex: null as
    | ((dbPath: string, root: string, relative: string) => void)
    | null,
}));

vi.mock("../index/indexer", async (importOriginal) => {
  const original = await importOriginal<typeof import("../index/indexer")>();
  return {
    ...original,
    indexFilePath: (...args: Parameters<typeof original.indexFilePath>) => {
      original.indexFilePath(...args);
      mocks.afterIndex?.(...args);
    },
  };
});

const temporaryDirectories: string[] = [];

function vault() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-create-rollback-"),
  );
  temporaryDirectories.push(root);
  return { root, db: path.join(root, "index.db") };
}

function issueFiles(root: string): string[] {
  return fs
    .readdirSync(path.join(root, ".copper/tasks/issues"))
    .filter((file) => file.endsWith(".md"));
}

function onlyIssuePath(root: string): string {
  const [file] = issueFiles(root);
  if (!file) throw new Error("The created issue file is missing");
  return path.join(root, ".copper/tasks/issues", file);
}

function failAfterIndexing(relativeSuffix: string): void {
  mocks.afterIndex = (_dbPath, _root, relative) => {
    if (!relative.endsWith(relativeSuffix)) return;
    mocks.afterIndex = null;
    throw new Error("Injected indexing failure");
  };
}

beforeEach(() => {
  mocks.afterIndex = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  mocks.afterIndex = null;
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("issue creation rollback", () => {
  it("removes a newly created file when indexing fails", () => {
    const { root, db } = vault();
    failAfterIndexing("only-one-requested.md");

    expect(() =>
      createIssue(root, db, { title: "Only one requested" }),
    ).toThrow("Injected indexing failure");

    expect(issueFiles(root)).toEqual([]);
  });

  it("allows retry after an index failure without creating a duplicate", () => {
    const { root, db } = vault();
    failAfterIndexing("only-one-requested.md");

    expect(() =>
      createIssue(root, db, { title: "Only one requested" }),
    ).toThrow("Injected indexing failure");
    const retried = createIssue(root, db, { title: "Only one requested" });

    expect(retried.id).toBe("ISSUE-1");
    expect(issueFiles(root)).toHaveLength(1);
    expect(listIssues(db).map((issue) => issue.id)).toEqual(["ISSUE-1"]);
  });

  it("removes the failed creation's stale index row", () => {
    const { root, db } = vault();
    failAfterIndexing("indexed-row.md");

    expect(() => createIssue(root, db, { title: "Indexed row" })).toThrow(
      "Injected indexing failure",
    );

    expect(listIssues(db)).toEqual([]);
  });

  it("preserves and reindexes an external edit made before rollback", () => {
    const { root, db } = vault();
    mocks.afterIndex = (_dbPath, vaultRoot, relative) => {
      if (!relative.endsWith("externally-edited.md")) return;
      mocks.afterIndex = null;
      const file = path.join(vaultRoot, relative);
      const source = fs.readFileSync(file, "utf8");
      fs.writeFileSync(
        file,
        source.replace("# Externally edited", "# Changed outside Copper"),
      );
      throw new Error("Injected indexing failure");
    };

    expect(() => createIssue(root, db, { title: "Externally edited" })).toThrow(
      "Injected indexing failure",
    );

    expect(issueFiles(root)).toHaveLength(1);
    expect(fs.readFileSync(onlyIssuePath(root), "utf8")).toContain(
      "# Changed outside Copper",
    );
    expect(listIssues(db).map((issue) => issue.title)).toEqual([
      "Changed outside Copper",
    ]);
  });

  it("keeps an externally deleted issue deleted and clears its index row", () => {
    const { root, db } = vault();
    mocks.afterIndex = (_dbPath, vaultRoot, relative) => {
      if (!relative.endsWith("deleted-outside.md")) return;
      mocks.afterIndex = null;
      fs.unlinkSync(path.join(vaultRoot, relative));
      throw new Error("Injected indexing failure");
    };

    expect(() => createIssue(root, db, { title: "Deleted outside" })).toThrow(
      "Injected indexing failure",
    );

    expect(issueFiles(root)).toEqual([]);
    expect(listIssues(db)).toEqual([]);
  });

  it("preserves an outside symlink and the original indexing failure", () => {
    const { root, db } = vault();
    const outsideDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "copper-create-rollback-outside-"),
    );
    temporaryDirectories.push(outsideDirectory);
    const outsideFile = path.join(outsideDirectory, "keep.md");
    const outsideContents = "Outside file must stay untouched.";
    fs.writeFileSync(outsideFile, outsideContents);
    const originalFailure = new Error("Injected indexing failure");
    mocks.afterIndex = (_dbPath, vaultRoot, relative) => {
      if (!relative.endsWith("symlink-replaced.md")) return;
      mocks.afterIndex = null;
      const createdFile = path.join(vaultRoot, relative);
      fs.unlinkSync(createdFile);
      fs.symlinkSync(outsideFile, createdFile);
      throw originalFailure;
    };

    let failure: unknown;
    try {
      createIssue(root, db, { title: "Symlink replaced" });
    } catch (error) {
      failure = error;
    }
    const createdFile = path.join(
      root,
      ".copper/tasks/issues/ISSUE-1-symlink-replaced.md",
    );

    expect(failure).toBe(originalFailure);
    expect(fs.lstatSync(createdFile).isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(createdFile)).toBe(outsideFile);
    expect(fs.readFileSync(outsideFile, "utf8")).toBe(outsideContents);
    expect(listIssues(db)).toEqual([]);
  });

  it("rolls back rank repairs when the created issue cannot be indexed", () => {
    const { root, db } = vault();
    const first = createIssue(root, db, { title: "First" });
    const second = createIssue(root, db, { title: "Second" });
    updateIssue(root, db, first.id, { rank: "A" });
    updateIssue(root, db, second.id, { rank: "A" });
    failAfterIndexing("create-after-rank-repair.md");

    expect(() =>
      createIssue(root, db, {
        title: "Create after rank repair",
        afterId: first.id,
      }),
    ).toThrow("Injected indexing failure");

    expect(listIssues(db).map((issue) => [issue.id, issue.rank])).toEqual([
      [first.id, "A"],
      [second.id, "A"],
    ]);
    expect(issueFiles(root).sort()).toEqual(
      [path.basename(first.path), path.basename(second.path)].sort(),
    );
  });
});
