import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreFile } from "../files/service";
import { indexVault } from "../index/indexer";
import { createIssue, listIssues } from "./service";
import { discoverTaskIdentities } from "./task-discovery";

const vaults: string[] = [];

afterEach(() => {
  for (const root of vaults.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeVault(name: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `copper-${name}-`));
  vaults.push(root);
  return root;
}

function writeIssue(root: string, relative: string, id: string): void {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(
    absolute,
    `---\ntype: issue\nid: ${id}\nstatus: todo\nrank: V\n---\n# ${id}\n`,
  );
}

function readIndexedIssues(dbPath: string) {
  return listIssues(dbPath, { includeArchived: true }).map(
    ({ id, path: issuePath }) => ({
      id,
      path: issuePath,
    }),
  );
}

function indexIssues(root: string, dbPath: string) {
  indexVault(dbPath, root);
  return readIndexedIssues(dbPath);
}

function accessDenied(
  operation: string,
  absolute: string,
): NodeJS.ErrnoException {
  return Object.assign(
    new Error(`EACCES: permission denied, ${operation} '${absolute}'`),
    { code: "EACCES" },
  );
}

describe("task identity discovery failures", () => {
  it("stops issue allocation when an eligible task file cannot be read", () => {
    const root = makeVault("task-discovery-file-error");
    const dbPath = path.join(root, "index.db");
    const active = "Research/issues/ISSUE-1.md";
    writeIssue(root, active, "ISSUE-1");
    fs.mkdirSync(path.join(root, ".copper/tasks/issues"), { recursive: true });
    fs.mkdirSync(path.join(root, ".copper/tasks/projects"), {
      recursive: true,
    });
    const indexBefore = indexIssues(root, dbPath);
    const issueNamesBefore = fs.readdirSync(
      path.join(root, ".copper/tasks/issues"),
    );
    const activeAbsolute = path.join(root, active);
    const readFile = fs.readFileSync;
    const spy = vi
      .spyOn(fs, "readFileSync")
      .mockImplementation((...args: Parameters<typeof fs.readFileSync>) => {
        if (String(args[0]) === activeAbsolute) {
          throw accessDenied("open", activeAbsolute);
        }
        return Reflect.apply(readFile, fs, args);
      });

    try {
      expect(() =>
        createIssue(root, dbPath, { title: "Blocked issue" }),
      ).toThrow(
        /Cannot discover task identities: failed to read file "Research\/issues\/ISSUE-1\.md".*EACCES/,
      );
      expect(fs.readdirSync(path.join(root, ".copper/tasks/issues"))).toEqual(
        issueNamesBefore,
      );
      expect(readIndexedIssues(dbPath)).toEqual(indexBefore);
    } finally {
      spy.mockRestore();
    }
  });

  it("stops archive restore when an eligible task directory cannot be listed", () => {
    const root = makeVault("task-discovery-directory-error");
    const dbPath = path.join(root, "index.db");
    const active = "Research/issues/ISSUE-2.md";
    const archived = ".copper/tasks/archive/issues/ISSUE-2-copy.md";
    writeIssue(root, active, "ISSUE-2");
    writeIssue(root, archived, "ISSUE-2");
    const indexBefore = indexIssues(root, dbPath);
    const source = fs.readFileSync(path.join(root, archived), "utf8");
    const destination = ".copper/tasks/issues/ISSUE-2-copy.md";
    const blockedDirectory = path.join(root, "Research");
    const readdir = fs.readdirSync;
    const spy = vi
      .spyOn(fs, "readdirSync")
      .mockImplementation((...args: Parameters<typeof fs.readdirSync>) => {
        if (String(args[0]) === blockedDirectory) {
          throw accessDenied("scandir", blockedDirectory);
        }
        return Reflect.apply(readdir, fs, args);
      });

    try {
      expect(() => restoreFile(root, archived)).toThrow(
        /Cannot discover task identities: failed to list directory "Research".*EACCES/,
      );
      expect(fs.readFileSync(path.join(root, archived), "utf8")).toBe(source);
      expect(fs.existsSync(path.join(root, destination))).toBe(false);
      expect(readIndexedIssues(dbPath)).toEqual(indexBefore);
    } finally {
      spy.mockRestore();
    }
  });

  it("skips a task file that disappears between listing and reading", () => {
    const root = makeVault("task-discovery-missing-file");
    const relative = "Research/issues/ISSUE-3.md";
    const absolute = path.join(root, relative);
    writeIssue(root, relative, "ISSUE-3");
    const readFile = fs.readFileSync;
    const spy = vi
      .spyOn(fs, "readFileSync")
      .mockImplementation((...args: Parameters<typeof fs.readFileSync>) => {
        if (String(args[0]) === absolute) {
          fs.rmSync(absolute);
          throw Object.assign(new Error("ENOENT: file disappeared"), {
            code: "ENOENT",
          });
        }
        return Reflect.apply(readFile, fs, args);
      });

    try {
      expect(discoverTaskIdentities(root)).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
