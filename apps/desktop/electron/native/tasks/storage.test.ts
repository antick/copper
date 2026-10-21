import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { scanTree } from "../files/tree";
import { indexFilePath, indexVault, rebuildIndex } from "../index/indexer";
import { notesInFolder, searchNotes } from "../search";
import { loadSession, saveSession } from "../settings";
import { normalizeWatchPath } from "../watcher";
import { archiveProject, getProject, listProjects } from "./project-service";
import { createIssue, getIssue, listIssues, updateIssue } from "./service";
import { migrateTaskStorage } from "./storage";
import { migrateTaskSession } from "./storage-session";

const temps: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of temps.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});
function vault() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-hidden-tasks-"));
  temps.push(dir);
  const root = path.join(dir, "vault");
  fs.mkdirSync(root);
  const write = (relative: string, text: string) => {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, text);
  };
  const read = (relative: string) =>
    fs.readFileSync(path.join(root, relative), "utf8");
  return { root, db: path.join(dir, "index.db"), write, read };
}
const issue =
  "---\ntype: issue\nid: NOTE-9\nstatus: todo\nproject: agents\nrank: a0\ncustom: keep\n---\n# Hidden migration\n\nBody stays here.\n";
const project =
  "---\ntype: project\nid: agents\nstatus: planned\n---\n# Agents\n";

it("remaps saved source tabs while keeping task navigation and ordinary favorites", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  const data = path.dirname(v.root);
  saveSession(data, "vault", {
    tabs: [{ path: "Tasks/Issues/NOTE-9-hidden.md", preview: false }],
    activePath: "Tasks/Issues/NOTE-9-hidden.md",
    favorites: ["Tasks/Issues/NOTE-9-hidden.md", "Notes.md"],
    tasksProject: "agents",
    tasksPinnedProjects: ["agents"],
  });
  migrateTaskSession(data, "vault", migrateTaskStorage(v.root));
  expect(loadSession(data, "vault")).toMatchObject({
    tabs: [{ path: ".copper/tasks/issues/NOTE-9-hidden.md", preview: false }],
    activePath: ".copper/tasks/issues/NOTE-9-hidden.md",
    favorites: ["Notes.md"],
    tasksProject: "agents",
    tasksPinnedProjects: ["agents"],
  });
});

it("migrates identified legacy tasks, preserves ordinary notes and links, and is repeatable", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  v.write("Tasks/Projects/agents.md", project);
  v.write("Tasks/Ideas.md", "# My ordinary notes\n");
  v.write("Tasks/Issues/personal.md", "# Ordinary note\n");
  v.write(
    "Inbox.md",
    "[Issue](Tasks/Issues/NOTE-9-hidden.md)\n[[Tasks/Projects/agents#Heading|Agents]]\n`Tasks/Projects/agents.md`\n",
  );
  indexVault(v.db, v.root);
  expect(getIssue(v.root, "NOTE-9").path).toBe(
    ".copper/tasks/issues/NOTE-9-hidden.md",
  );
  expect(v.read(".copper/tasks/issues/NOTE-9-hidden.md")).toBe(issue);
  expect(v.read("Tasks/Ideas.md")).toBe("# My ordinary notes\n");
  expect(v.read("Tasks/Issues/personal.md")).toBe("# Ordinary note\n");
  expect(v.read("Inbox.md")).toContain(
    "[Issue](.copper/tasks/issues/NOTE-9-hidden.md)",
  );
  expect(v.read("Inbox.md")).toContain(
    "[[.copper/tasks/projects/agents#Heading|Agents]]",
  );
  expect(v.read("Inbox.md")).toContain("`Tasks/Projects/agents.md`");
  expect(migrateTaskStorage(v.root)).toEqual([]);
  expect(createIssue(v.root, v.db, { title: "Next" }, "NOTE").id).toBe(
    "NOTE-10",
  );
});

it("rewrites links in managed active and archived tasks without touching unrelated hidden folders", () => {
  const v = vault();
  const currentActive = issue
    .replaceAll("NOTE-9", "ISSUE-1")
    .replace("Hidden migration", "Current active")
    .replace(
      "Body stays here.",
      "[active](../../../Tasks/Issues/ISSUE-2-two.md)\n[[Tasks/Issues/ISSUE-2-two]]\n[[Archive/Tasks/Issues/ISSUE-3-three.md]]",
    );
  const currentArchived = issue
    .replaceAll("NOTE-9", "ISSUE-4")
    .replace("Hidden migration", "Current archived")
    .replace(
      "Body stays here.",
      "[archived](../../../../Archive/Tasks/Issues/ISSUE-3-three.md)\n[[Archive/Tasks/Issues/ISSUE-3-three]]",
    );
  v.write(".copper/tasks/issues/ISSUE-1-one.md", currentActive);
  v.write(".copper/tasks/archive/issues/ISSUE-4-four.md", currentArchived);
  v.write(
    "Tasks/Issues/ISSUE-2-two.md",
    issue
      .replaceAll("NOTE-9", "ISSUE-2")
      .replace("Hidden migration", "Legacy active"),
  );
  v.write(
    "Archive/Tasks/Issues/ISSUE-3-three.md",
    issue
      .replaceAll("NOTE-9", "ISSUE-3")
      .replace("Hidden migration", "Legacy archived"),
  );
  const unrelated = "[legacy](Tasks/Issues/ISSUE-2-two.md)\n";
  v.write(".other/note.md", unrelated);
  v.write(".git/note.md", unrelated);
  v.write(".copper/other/note.md", unrelated);

  migrateTaskStorage(v.root);

  expect(v.read(".copper/tasks/issues/ISSUE-1-one.md")).toContain(
    "[active](ISSUE-2-two.md)",
  );
  expect(v.read(".copper/tasks/issues/ISSUE-1-one.md")).toContain(
    "[[.copper/tasks/issues/ISSUE-2-two]]",
  );
  expect(v.read(".copper/tasks/issues/ISSUE-1-one.md")).toContain(
    "[[.copper/tasks/archive/issues/ISSUE-3-three.md]]",
  );
  expect(v.read(".copper/tasks/archive/issues/ISSUE-4-four.md")).toContain(
    "[archived](ISSUE-3-three.md)",
  );
  expect(v.read(".copper/tasks/archive/issues/ISSUE-4-four.md")).toContain(
    "[[.copper/tasks/archive/issues/ISSUE-3-three]]",
  );
  expect(v.read(".other/note.md")).toBe(unrelated);
  expect(v.read(".git/note.md")).toBe(unrelated);
  expect(v.read(".copper/other/note.md")).toBe(unrelated);
});

it("restores rewritten managed tasks when a later migration step fails", () => {
  const v = vault();
  const current = issue
    .replaceAll("NOTE-9", "ISSUE-1")
    .replace("Hidden migration", "Current task")
    .replace(
      "Body stays here.",
      "[legacy](../../../Tasks/Issues/ISSUE-2-two.md)",
    );
  const legacy = issue.replaceAll("NOTE-9", "ISSUE-2");
  v.write(".copper/tasks/issues/ISSUE-1-one.md", current);
  v.write("Tasks/Issues/ISSUE-2-two.md", legacy);
  const unlink = fs.unlinkSync;
  let contentAtFailure = "";
  vi.spyOn(fs, "unlinkSync").mockImplementation((filePath) => {
    if (String(filePath).endsWith("/Tasks/Issues/ISSUE-2-two.md")) {
      contentAtFailure = v.read(".copper/tasks/issues/ISSUE-1-one.md");
      throw new Error("permission denied");
    }
    return unlink(filePath);
  });

  expect(() => migrateTaskStorage(v.root)).toThrow("permission denied");
  expect(contentAtFailure).toContain("[legacy](ISSUE-2-two.md)");
  expect(v.read(".copper/tasks/issues/ISSUE-1-one.md")).toBe(current);
  expect(v.read("Tasks/Issues/ISSUE-2-two.md")).toBe(legacy);
  expect(
    fs.existsSync(path.join(v.root, ".copper/tasks/issues/ISSUE-2-two.md")),
  ).toBe(false);
});

it("keeps hidden tasks indexed after rebuild and source edits while excluding them from Notes", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  v.write("Tasks/Projects/agents.md", project);
  indexVault(v.db, v.root);
  rebuildIndex(v.db, v.root);
  expect(listIssues(v.db)).toHaveLength(1);
  expect(listProjects(v.db)).toHaveLength(1);
  expect(scanTree(v.root).children).toEqual([]);
  expect(notesInFolder(v.db, "all")).toEqual([]);
  expect(searchNotes(v.db, "Hidden")).toEqual([]);
  const task = getIssue(v.root, "NOTE-9");
  v.write(task.path, issue.replace("Hidden migration", "Edited source"));
  indexFilePath(v.db, v.root, task.path);
  expect(listIssues(v.db)[0].title).toBe("Edited source");
  updateIssue(v.root, v.db, "NOTE-9", { status: "done" });
  expect(getIssue(v.root, "NOTE-9").status).toBe("done");
});

it("never overwrites colliding destination files", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  v.write(".copper/tasks/issues/NOTE-9-hidden.md", "# Keep my existing file\n");
  const moves = migrateTaskStorage(v.root);
  expect(moves).toEqual([
    {
      from: "Tasks/Issues/NOTE-9-hidden.md",
      to: ".copper/tasks/issues/NOTE-9-hidden-2.md",
    },
  ]);
  expect(v.read(".copper/tasks/issues/NOTE-9-hidden.md")).toBe(
    "# Keep my existing file\n",
  );
  expect(v.read(moves[0].to)).toBe(issue);
});

it("resumes an interrupted copy without creating duplicate task identities", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  v.write(".copper/tasks/issues/NOTE-9-hidden.md", issue);
  indexVault(v.db, v.root);
  expect(listIssues(v.db).map((task) => task.id)).toEqual(["NOTE-9"]);
  expect(fs.existsSync(path.join(v.root, "Tasks"))).toBe(false);
});

it("preserves both versions when the same id has conflicting source content", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  v.write(
    ".copper/tasks/issues/NOTE-9-hidden.md",
    issue.replace("Body stays here", "Another version"),
  );
  expect(() => migrateTaskStorage(v.root)).toThrow("Both files have been kept");
  expect(v.read("Tasks/Issues/NOTE-9-hidden.md")).toBe(issue);
  expect(v.read(".copper/tasks/issues/NOTE-9-hidden.md")).toContain(
    "Another version",
  );
});

it("reserves archived issue ids and safely rejects a symlink escape", () => {
  const v = vault();
  v.write("Archive/Tasks/Issues/NOTE-9-hidden.md", issue);
  indexVault(v.db, v.root);
  expect(listIssues(v.db)).toEqual([]);
  expect(createIssue(v.root, v.db, { title: "Next" }, "NOTE").id).toBe(
    "NOTE-10",
  );
  const escaped = vault();
  escaped.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  fs.symlinkSync(v.root, path.join(escaped.root, ".copper"), "dir");
  expect(() => migrateTaskStorage(escaped.root)).toThrow(
    "outside the active Vault",
  );
  expect(escaped.read("Tasks/Issues/NOTE-9-hidden.md")).toBe(issue);
});

it("rolls back a failed migration and leaves source files intact", () => {
  const v = vault();
  v.write("Tasks/Issues/NOTE-9-hidden.md", issue);
  v.write("Tasks/Projects/agents.md", project);
  const copy = fs.copyFileSync;
  vi.spyOn(fs, "copyFileSync").mockImplementation((from, to, flags) => {
    if (String(to).endsWith("agents.md")) throw new Error("disk full");
    return copy(from, to, flags);
  });
  expect(() => migrateTaskStorage(v.root)).toThrow("disk full");
  expect(v.read("Tasks/Issues/NOTE-9-hidden.md")).toBe(issue);
  expect(v.read("Tasks/Projects/agents.md")).toBe(project);
  expect(
    fs.existsSync(path.join(v.root, ".copper/tasks/issues/NOTE-9-hidden.md")),
  ).toBe(false);
});

it("keeps task archives lowercase and migrates archived legacy projects", () => {
  const v = vault();
  v.write("Archive/Tasks/Projects/agents.md", project);
  indexVault(v.db, v.root);
  expect(getProject(v.root, v.db, "agents").path).toBe(
    ".copper/tasks/archive/projects/agents.md",
  );
  expect(listProjects(v.db)[0].archived).toBe(true);
  v.write("Tasks/Projects/second.md", project.replaceAll("agents", "second"));
  indexVault(v.db, v.root);
  archiveProject(v.root, v.db, "second");
  expect(getProject(v.root, v.db, "second").path).toBe(
    ".copper/tasks/archive/projects/second.md",
  );
});

it("watches managed task sources but excludes other hidden files and atomic saves", () => {
  const v = vault();
  expect(
    normalizeWatchPath(
      v.root,
      path.join(v.root, ".copper/tasks/issues/NOTE-9.md"),
      "modified",
    ),
  ).toEqual({ type: "modified", path: ".copper/tasks/issues/NOTE-9.md" });
  for (const file of [
    ".git/config",
    ".copper/settings.json",
    ".copper/tasks/issues/.NOTE-9.md.copper-tmp",
    ".other/note.md",
  ]) {
    expect(
      normalizeWatchPath(v.root, path.join(v.root, file), "modified"),
    ).toBeUndefined();
  }
});
