import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { archiveFile, restoreFile } from "../files/service";
import { indexFilePath, indexVault } from "../index/indexer";
import { isArchivedTaskSourcePath } from "./archive-service";
import { createProject, listProjects } from "./project-service";
import { createIssue, listIssues } from "./service";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function vault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-task-archive-"));
  temporaryDirectories.push(root);
  return { root, db: path.join(root, "index.db") };
}

function listArchivedTaskSources(db: string) {
  return [
    ...listIssues(db, { includeArchived: true }).map((issue) => ({
      ...issue,
      kind: "issue",
    })),
    ...listProjects(db).map((project) => ({ ...project, kind: "project" })),
  ].filter((item) => isArchivedTaskSourcePath(item.path));
}
function restoreArchivedTaskSource(
  root: string,
  db: string,
  archivedPath: string,
) {
  const restored = restoreFile(root, archivedPath);
  indexFilePath(db, root, archivedPath);
  indexFilePath(db, root, restored);
  return restored;
}

function writeTaskFile(root: string, relative: string, source: string) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, source);
  return absolute;
}

function issueSource(id: string) {
  return `---\ntype: issue\nid: ${id}\nstatus: todo\n---\n# ${id}\n`;
}

function projectSource(id: string) {
  return `---\ntype: project\nid: ${id}\nstatus: planned\n---\n# ${id}\n`;
}

describe("task archive service", () => {
  it("discovers archived issue and project sources and restores an issue", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Archived issue" });
    const issueArchivePath = archiveFile(root, issue.path);
    indexFilePath(db, root, issue.path);
    indexFilePath(db, root, issueArchivePath);

    const notesIssue = createIssue(root, db, { title: "Notes archive" });
    const notesArchivePath = `Archive/${notesIssue.path}`;
    fs.mkdirSync(path.dirname(path.join(root, notesArchivePath)), {
      recursive: true,
    });
    fs.renameSync(
      path.join(root, notesIssue.path),
      path.join(root, notesArchivePath),
    );
    indexFilePath(db, root, notesIssue.path);
    indexFilePath(db, root, notesArchivePath);

    const project = createProject(root, db, { name: "Archived project" });
    const projectArchivePath = archiveFile(root, project.path);
    indexFilePath(db, root, project.path);
    indexFilePath(db, root, projectArchivePath);

    indexVault(db, root);
    expect(listArchivedTaskSources(db)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: issueArchivePath, kind: "issue" }),
        expect.objectContaining({ path: notesArchivePath, kind: "issue" }),
        expect.objectContaining({ path: projectArchivePath, kind: "project" }),
      ]),
    );

    expect(restoreArchivedTaskSource(root, db, issueArchivePath)).toBe(
      issue.path,
    );
    expect(restoreArchivedTaskSource(root, db, notesArchivePath)).toBe(
      notesIssue.path,
    );
    expect(listArchivedTaskSources(db)).toEqual([
      expect.objectContaining({ path: projectArchivePath, kind: "project" }),
    ]);
  });

  it("preserves the archived source and index when a restore path collides", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Collision" });
    const archivePath = archiveFile(root, issue.path);
    fs.mkdirSync(path.dirname(path.join(root, issue.path)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, issue.path),
      "A newer file already exists.\n",
    );
    indexFilePath(db, root, issue.path);
    indexFilePath(db, root, archivePath);

    expect(() => restoreArchivedTaskSource(root, db, archivePath)).toThrow(
      "Archive destination already exists",
    );
    expect(fs.existsSync(path.join(root, archivePath))).toBe(true);
    expect(fs.existsSync(path.join(root, issue.path))).toBe(true);
    expect(listArchivedTaskSources(db)).toEqual([
      expect.objectContaining({ path: archivePath, kind: "issue" }),
    ]);
  });

  it("rejects an archived issue when a differently named active issue has its ID", () => {
    const { root, db } = vault();
    const archivePath = "Archive/.copper/tasks/issues/ISSUE-1-old.md";
    const activePath = ".copper/tasks/issues/ISSUE-1-new.md";
    const archivedSource = issueSource("ISSUE-1");
    const activeSource = issueSource("ISSUE-1");
    writeTaskFile(root, archivePath, archivedSource);
    indexFilePath(db, root, archivePath);
    writeTaskFile(root, activePath, activeSource);

    expect(listIssues(db)).toEqual([]);
    expect(
      listIssues(db, { includeArchived: true }).map((item) => item.path),
    ).toEqual([archivePath]);
    expect(() => restoreFile(root, archivePath)).toThrow(
      "Cannot restore issue ISSUE-1 because it is already active",
    );
    expect(fs.readFileSync(path.join(root, archivePath), "utf8")).toBe(
      archivedSource,
    );
    expect(fs.readFileSync(path.join(root, activePath), "utf8")).toBe(
      activeSource,
    );
    expect(
      listIssues(db, { includeArchived: true }).map((item) => item.path),
    ).toEqual([archivePath]);
  });

  it("rejects an archived project when a differently named active project has its ID", () => {
    const { root } = vault();
    const archivePath = ".copper/tasks/archive/projects/archived-name.md";
    const activePath = ".copper/tasks/projects/active-name.md";
    writeTaskFile(root, archivePath, projectSource("shared-project"));
    writeTaskFile(root, activePath, projectSource("shared-project"));

    expect(() => restoreFile(root, archivePath)).toThrow(
      "Cannot restore project shared-project because it is already active",
    );
    expect(fs.existsSync(path.join(root, archivePath))).toBe(true);
    expect(fs.existsSync(path.join(root, activePath))).toBe(true);
  });

  it("uses an issue filename to protect against a collision when archived metadata is malformed", () => {
    const { root } = vault();
    const archivePath = "Archive/.copper/tasks/issues/ISSUE-4-old.md";
    const activePath = ".copper/tasks/issues/ISSUE-4-new.md";
    const malformedSource =
      "---\ntype: issue\nid: ISSUE-4\n: invalid\n---\n# Old\n";
    writeTaskFile(root, archivePath, malformedSource);
    writeTaskFile(root, activePath, issueSource("ISSUE-4"));

    expect(() => restoreFile(root, archivePath)).toThrow(
      "Cannot restore issue ISSUE-4 because it is already active",
    );
    expect(fs.readFileSync(path.join(root, archivePath), "utf8")).toBe(
      malformedSource,
    );
  });

  it("restores a generic archived issue when its ID is not active", () => {
    const { root } = vault();
    const archivePath = "Archive/.copper/tasks/issues/ISSUE-9-old.md";
    const source = issueSource("ISSUE-9");
    writeTaskFile(root, archivePath, source);

    expect(restoreFile(root, archivePath)).toBe(
      ".copper/tasks/issues/ISSUE-9-old.md",
    );
    expect(
      fs.readFileSync(
        path.join(root, ".copper/tasks/issues/ISSUE-9-old.md"),
        "utf8",
      ),
    ).toBe(source);
  });
});
