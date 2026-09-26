import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { archiveFile, trashPath } from "../files/service";
import { indexFilePath } from "../index/indexer";
import { parseFrontmatter, writeFrontmatter } from "../markdown/frontmatter";
import { createProject, listProjects } from "./project-service";
import {
  addIssueComment,
  createIssue,
  deleteIssueComment,
  getIssue,
  listIssues,
  moveIssue,
  updateIssue,
  updateIssueComment,
} from "./service";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function vault(): { root: string; db: string } {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "copper-parent-"));
  temps.push(parent);
  const root = path.join(parent, "Copper");
  fs.mkdirSync(root);
  return { root, db: path.join(root, "index.db") };
}

describe("tasks service", () => {
  it("creates an issue file with defaults and no .copper directory", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Fast board" });
    expect(issue.id).toBe("ISSUE-1");
    expect(issue.status).toBe("todo");
    expect(issue.priority).toBe("none");
    expect(issue.path.startsWith("Tasks/Issues/")).toBe(true);
    expect(fs.existsSync(path.join(root, ".copper"))).toBe(false);
    expect(listIssues(db).map((item) => item.id)).toEqual(["ISSUE-1"]);
  });

  it("keeps compact hash identifiers stable through lookup and updates", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Hash issue" }, "#");
    const originalPath = issue.path;
    expect(issue.id).toBe("#1");
    expect(getIssue(root, "#1").id).toBe("#1");
    const updated = updateIssue(root, db, "#1", { title: "Renamed hash" });
    expect(updated.id).toBe("#1");
    expect(updated.path).toBe(originalPath);
    expect(fs.existsSync(path.join(root, originalPath))).toBe(true);
  });

  it("creates a duplicate immediately after the source issue", () => {
    const { root, db } = vault();
    const first = createIssue(root, db, { title: "A" });
    const third = createIssue(root, db, { title: "C" });
    const copy = createIssue(root, db, {
      title: "A",
      afterId: first.id,
    });
    expect(
      listIssues(db)
        .filter((issue) => issue.status === "todo")
        .map((issue) => issue.id),
    ).toEqual([first.id, copy.id, third.id]);
    expect(copy.rank > first.rank && copy.rank < third.rank).toBe(true);
  });

  it("writes an optional description on create", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, {
      title: "With body",
      body: "Repro steps",
      priority: "high",
      labels: ["ui"],
    });
    const source = fs.readFileSync(path.join(root, issue.path), "utf8");
    expect(issue.priority).toBe("high");
    expect(issue.labels).toEqual(["ui"]);
    expect(source).toContain("# With body");
    expect(source).toContain("Repro steps");
  });

  it("normalizes malformed comments while preserving order and extra metadata", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, {
      title: "Comments",
      body: "Keep **this** description.",
    });
    const file = path.join(root, issue.path);
    const source = fs.readFileSync(file, "utf8");
    const parsed = parseFrontmatter(source);
    parsed.values.assignee = "example-user";
    parsed.values.comments = [
      {
        id: "first",
        body: "First",
        created: "2026-08-30T10:00:00.000Z",
        updated: "2026-08-30T10:00:00.000Z",
      },
      { id: "missing-body", created: "2026-08-30T10:01:00.000Z" },
      "not a comment",
      {
        id: "second",
        body: "Second",
        created: "2026-08-30T10:02:00.000Z",
        updated: "2026-08-30T10:02:00.000Z",
      },
    ];
    fs.writeFileSync(file, writeFrontmatter(parsed, source));
    indexFilePath(db, root, issue.path);

    expect(getIssue(root, issue.id).comments).toEqual([
      {
        id: "first",
        body: "First",
        created: "2026-08-30T10:00:00.000Z",
        updated: "2026-08-30T10:00:00.000Z",
      },
      {
        id: "second",
        body: "Second",
        created: "2026-08-30T10:02:00.000Z",
        updated: "2026-08-30T10:02:00.000Z",
      },
    ]);
    const updated = addIssueComment(root, db, issue.id, "Third");
    const written = parseFrontmatter(fs.readFileSync(file, "utf8"));
    expect(updated.comments).toHaveLength(3);
    expect(written.values.assignee).toBe("example-user");
    expect(written.body).toBe(issue.body);
  });

  it("adds, edits, and deletes comments without changing the description", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, {
      title: "Comment lifecycle",
      body: "Description stays intact.",
    });
    const file = path.join(root, issue.path);
    const body = parseFrontmatter(fs.readFileSync(file, "utf8")).body;
    const first = addIssueComment(root, db, issue.id, " First comment ");
    const second = addIssueComment(root, db, issue.id, "Second comment");
    expect(first.comments).toHaveLength(1);
    expect(first.comments?.[0]).toMatchObject({
      created: first.updated,
      updated: first.updated,
    });
    expect(second.comments).toHaveLength(2);
    expect(second.comments?.map(({ body: text }) => text)).toEqual([
      "First comment",
      "Second comment",
    ]);
    expect(listIssues(db).find(({ id }) => id === issue.id)?.updated).toBe(
      second.updated,
    );

    const firstId = first.comments?.[0]?.id;
    const secondId = second.comments?.[1]?.id;
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    const edited = updateIssueComment(
      root,
      db,
      issue.id,
      firstId as string,
      "Edited first comment",
    );
    expect(edited.comments?.map(({ body: text }) => text)).toEqual([
      "Edited first comment",
      "Second comment",
    ]);
    expect(edited.comments?.[0]?.updated).toBe(edited.updated);
    const deleted = deleteIssueComment(root, db, issue.id, secondId as string);
    expect(deleted.comments).toHaveLength(1);
    expect(listIssues(db).find(({ id }) => id === issue.id)?.updated).toBe(
      deleted.updated,
    );
    expect(parseFrontmatter(fs.readFileSync(file, "utf8")).body).toBe(body);
  });

  it("rejects empty comments and leaves bytes unchanged for missing comments", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Comment errors" });
    const file = path.join(root, issue.path);
    const before = fs.readFileSync(file, "utf8");
    expect(() => addIssueComment(root, db, issue.id, " \n ")).toThrow(
      "Comment body is required",
    );
    expect(() =>
      updateIssueComment(root, db, issue.id, "missing", "replacement"),
    ).toThrow("Comment missing was not found");
    expect(() => deleteIssueComment(root, db, issue.id, "missing")).toThrow(
      "Comment missing was not found",
    );
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });

  it("updates fields and preserves extra frontmatter", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Board" });
    const file = path.join(root, issue.path);
    const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
    parsed.values.assignee = "example-user";
    fs.writeFileSync(
      file,
      writeFrontmatter(parsed, fs.readFileSync(file, "utf8")),
    );
    indexFilePath(db, root, issue.path);
    const updated = updateIssue(root, db, issue.id, { status: "in_progress" });
    expect(updated.status).toBe("in_progress");
    const again = parseFrontmatter(
      fs.readFileSync(path.join(root, updated.path), "utf8"),
    );
    expect(again.values.assignee).toBe("example-user");
    expect(again.body).toContain("Board");
  });

  it("moves an issue by rewriting only that file", () => {
    const { root, db } = vault();
    const first = createIssue(root, db, { title: "A" });
    const second = createIssue(root, db, { title: "B" });
    const firstBytes = fs.readFileSync(path.join(root, first.path));
    const secondBytes = fs.readFileSync(path.join(root, second.path));
    const moved = moveIssue(root, db, first.id, {
      status: "done",
      afterId: null,
      beforeId: null,
    });
    expect(moved.status).toBe("done");
    expect(fs.readFileSync(path.join(root, second.path))).toEqual(secondBytes);
    expect(
      fs.readFileSync(path.join(root, first.path)).equals(firstBytes),
    ).toBe(false);
    expect(listIssues(db).find((item) => item.id === second.id)?.status).toBe(
      "todo",
    );
  });

  it("reverts a failed status write", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Locked" });
    const issuesDir = path.join(root, "Tasks", "Issues");
    fs.chmodSync(issuesDir, 0o555);
    expect(() => updateIssue(root, db, issue.id, { status: "done" })).toThrow();
    fs.chmodSync(issuesDir, 0o755);
    expect(getIssue(root, issue.id).status).toBe("todo");
  });

  it("drops archived issues from the list", () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Old" });
    const archived = archiveFile(root, issue.path);
    indexFilePath(db, root, issue.path);
    indexFilePath(db, root, archived);
    expect(listIssues(db).map((item) => item.id)).toEqual([]);
  });

  it("drops trashed issues from the list", async () => {
    const { root, db } = vault();
    const issue = createIssue(root, db, { title: "Gone" });
    await trashPath(root, issue.path, async (absolute) => {
      fs.rmSync(absolute, { force: true });
    });
    indexFilePath(db, root, issue.path);
    expect(listIssues(db).map((item) => item.id)).toEqual([]);
  });

  it("creates a project and lists empty counts", () => {
    const { root, db } = vault();
    const project = createProject(root, db, { name: "Copper" });
    expect(project.id).toBe("copper");
    expect(project.status).toBe("planned");
    expect(listProjects(db)[0]?.counts.todo).toBe(0);
    expect(fs.existsSync(path.join(root, ".copper"))).toBe(false);
  });
});
