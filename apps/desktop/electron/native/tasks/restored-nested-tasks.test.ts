import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { archiveFile, restoreFile } from "../files/service";
import { indexVault } from "../index/indexer";
import { parseFrontmatter } from "../markdown/frontmatter";
import {
  archiveProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "./project-service";
import {
  addIssueComment,
  deleteIssueComment,
  getIssue,
  listIssues,
  moveIssue,
  updateIssue,
  updateIssueComment,
} from "./service";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function vault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-restored-tasks-"));
  temporaryDirectories.push(root);
  return { root, db: path.join(root, "index.db") };
}

function writeArchivedTask(
  root: string,
  kind: "issue" | "project",
  id: string,
  project?: string,
) {
  const relative = `Archive/Research/${kind}s/${id}.md`;
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const projectLine = project ? `project: ${project}\n` : "";
  fs.writeFileSync(
    absolute,
    "---\ntype: " +
      kind +
      "\nid: " +
      id +
      "\nstatus: todo\n" +
      projectLine +
      "---\n# Restored item\n",
  );
  return relative;
}

function restoreTask(
  root: string,
  db: string,
  kind: "issue" | "project",
  id: string,
  project?: string,
) {
  const archived = writeArchivedTask(root, kind, id, project);
  const restored = restoreFile(root, archived);
  indexVault(db, root);
  return restored;
}

describe("restored nested task lookup", () => {
  it("reads, edits, moves, comments on, and archives a restored nested issue", () => {
    const { root, db } = vault();
    const issuePath = restoreTask(root, db, "issue", "ISSUE-1");

    expect(listIssues(db).find((issue) => issue.id === "ISSUE-1")?.path).toBe(
      issuePath,
    );
    expect(getIssue(root, "ISSUE-1")).toMatchObject({
      id: "ISSUE-1",
      path: issuePath,
    });

    updateIssue(root, db, "ISSUE-1", { title: "Updated nested issue" });
    moveIssue(root, db, "ISSUE-1", { status: "in_progress" });
    const added = addIssueComment(root, db, "ISSUE-1", "A nested comment");
    const commentId = added.comments?.[0]?.id;
    expect(commentId).toBeTruthy();
    updateIssueComment(
      root,
      db,
      "ISSUE-1",
      commentId as string,
      "Edited comment",
    );
    const withoutComment = deleteIssueComment(
      root,
      db,
      "ISSUE-1",
      commentId as string,
    );
    expect(withoutComment.comments).toEqual([]);

    const source = fs.readFileSync(path.join(root, issuePath), "utf8");
    expect(parseFrontmatter(source).values).toMatchObject({
      id: "ISSUE-1",
      status: "in_progress",
    });
    expect(source).toContain("# Updated nested issue");

    const archivedPath = archiveFile(root, issuePath);
    indexVault(db, root);
    expect(fs.existsSync(path.join(root, issuePath))).toBe(false);
    expect(fs.existsSync(path.join(root, archivedPath))).toBe(true);
    expect(listIssues(db)).toEqual([]);
    expect(
      listIssues(db, { includeArchived: true }).map((issue) => issue.path),
    ).toEqual([archivedPath]);
    expect(() => getIssue(root, "ISSUE-1")).toThrow(/not found/i);
  });

  it("preserves stored issue IDs while looking up canonical aliases", () => {
    const { root, db } = vault();
    const issuePath = restoreTask(root, db, "issue", "issue-001");

    expect(getIssue(root, "ISSUE-1")).toMatchObject({
      id: "issue-001",
      path: issuePath,
    });
    updateIssue(root, db, "ISSUE-1", { title: "Canonical lookup" });
    moveIssue(root, db, "ISSUE-1", { status: "done" });

    const source = fs.readFileSync(path.join(root, issuePath), "utf8");
    expect(parseFrontmatter(source).values.id).toBe("issue-001");
    expect(getIssue(root, "issue-001").status).toBe("done");
  });

  it("does not reinterpret opaque issue IDs as canonical prefixes", () => {
    const { root, db } = vault();
    const issuePath = "Research/issues/ISSUE-1-other.md";
    const absolute = path.join(root, issuePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const source =
      "---\ntype: issue\nid: ISSUE-1-other\nstatus: todo\n---\n# Opaque ID\n";
    fs.writeFileSync(absolute, source);
    indexVault(db, root);

    expect(getIssue(root, "ISSUE-1-other")).toMatchObject({
      id: "ISSUE-1-other",
      path: issuePath,
    });
    expect(() => getIssue(root, "ISSUE-1")).toThrow(/not found/i);
    updateIssue(root, db, "ISSUE-1-other", { title: "Still opaque" });
    expect(parseFrontmatter(fs.readFileSync(absolute, "utf8")).values.id).toBe(
      "ISSUE-1-other",
    );
  });

  it("reads, updates, and archives a restored nested project", () => {
    const { root, db } = vault();
    const projectPath = restoreTask(root, db, "project", "nested-project");

    expect(
      listProjects(db).find((project) => project.id === "nested-project")?.path,
    ).toBe(projectPath);
    expect(getProject(root, db, "nested-project").path).toBe(projectPath);
    updateProject(root, db, "nested-project", {
      title: "Updated nested project",
      icon: "rocket",
    });
    archiveProject(root, db, "nested-project");

    const archivedPath = `Archive/${projectPath}`;
    expect(fs.existsSync(path.join(root, projectPath))).toBe(false);
    expect(fs.existsSync(path.join(root, archivedPath))).toBe(true);
    expect(getProject(root, db, "nested-project")).toMatchObject({
      path: archivedPath,
      title: "Updated nested project",
      icon: "rocket",
      archived: true,
    });
    expect(
      listProjects(db).find((project) => project.id === "nested-project"),
    ).toMatchObject({ path: archivedPath, archived: true });
  });

  it("prefers an active project when an archived project has the same ID", () => {
    const { root, db } = vault();
    writeArchivedTask(root, "project", "same-project");
    const activePath = "Research/projects/same-project-active.md";
    const activeAbsolute = path.join(root, activePath);
    fs.mkdirSync(path.dirname(activeAbsolute), { recursive: true });
    fs.writeFileSync(
      activeAbsolute,
      "---\ntype: project\nid: same-project\nstatus: planned\n---\n# Active\n",
    );
    indexVault(db, root);

    expect(getProject(root, db, "same-project").path).toBe(activePath);
  });

  it("deletes a restored nested project and unlinks its restored nested issue", async () => {
    const { root, db } = vault();
    const projectPath = restoreTask(root, db, "project", "delete-me");
    const issuePath = restoreTask(root, db, "issue", "ISSUE-8", "delete-me");
    const expectedTrashPath = fs.realpathSync(path.join(root, projectPath));
    const trashed: string[] = [];

    await deleteProject(root, db, "delete-me", async (absolute) => {
      trashed.push(absolute);
      fs.rmSync(absolute, { force: true });
    });

    expect(trashed).toEqual([expectedTrashPath]);
    expect(fs.existsSync(path.join(root, projectPath))).toBe(false);
    expect(getIssue(root, "ISSUE-8").path).toBe(issuePath);
    expect(getIssue(root, "ISSUE-8").project).toBeNull();
    expect(
      listIssues(db).find((issue) => issue.id === "ISSUE-8")?.project,
    ).toBeNull();
    expect(listProjects(db).some((project) => project.id === "delete-me")).toBe(
      false,
    );
    expect(() => getProject(root, db, "delete-me")).toThrow(/not found/i);
  });

  it("does not look up or mutate task files in hidden folders", () => {
    const { root } = vault();
    const hiddenPath = "Research/.private/ISSUE-9.md";
    const absolute = path.join(root, hiddenPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const source =
      "---\ntype: issue\nid: ISSUE-9\nstatus: todo\n---\n# Hidden\n";
    fs.writeFileSync(absolute, source);

    expect(() => getIssue(root, "ISSUE-9")).toThrow(/not found/i);
    expect(() =>
      updateIssue(root, path.join(root, "index.db"), "ISSUE-9", {
        title: "No",
      }),
    ).toThrow(/not found/i);
    expect(fs.readFileSync(absolute, "utf8")).toBe(source);
  });

  it("does not look up or mutate task files through excluded symlinks", (context) => {
    const { root, db } = vault();
    const targetPath = "Research/.private/ISSUE-10.md";
    const aliasPath = "Research/issues/ISSUE-10.md";
    const target = path.join(root, targetPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const source =
      "---\ntype: issue\nid: ISSUE-10\nstatus: todo\n---\n# Linked\n";
    fs.writeFileSync(target, source);
    fs.mkdirSync(path.dirname(path.join(root, aliasPath)), { recursive: true });
    try {
      fs.symlinkSync(target, path.join(root, aliasPath), "file");
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

    expect(() => getIssue(root, "ISSUE-10")).toThrow(/not found/i);
    expect(() => updateIssue(root, db, "ISSUE-10", { title: "No" })).toThrow(
      /not found/i,
    );
    expect(fs.readFileSync(target, "utf8")).toBe(source);
  });
});
