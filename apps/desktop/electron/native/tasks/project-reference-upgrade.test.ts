import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { openIndex } from "../index/db";
import { indexVault } from "../index/indexer";
import { loadSession, saveSession } from "../settings";
import { deleteProject, getProject, listProjects } from "./project-service";
import { createIssue, listIssues } from "./service";

const directories: string[] = [];
const LEGACY_SCHEMA_VERSION = 3;
const PROJECT_ID = "Research Plan";

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps project references intact when rebuilding a schema 3 fallback ID", async () => {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-project-reference-upgrade-"),
  );
  directories.push(parent);
  const root = path.join(parent, "vault");
  const dataDir = path.join(parent, "data");
  const dbPath = path.join(dataDir, "index.db");
  const relative = ".copper/tasks/projects/Research Plan.md";
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(
    absolute,
    "---\ntype: project\nstatus: planned\n---\n# Research Plan\n",
  );
  indexVault(dbPath, root);

  const issue = createIssue(root, dbPath, {
    title: "Linked before cache upgrade",
    project: PROJECT_ID,
  });
  const oldCache = openIndex(dbPath);
  oldCache
    .prepare("UPDATE tasks SET id = ? WHERE path = ?")
    .run("research-plan", relative);
  oldCache.pragma(`user_version = ${LEGACY_SCHEMA_VERSION}`);
  oldCache.close();

  saveSession(dataDir, "vault", {
    workspaceMode: "tasks",
    tasksProjectOrder: [PROJECT_ID],
    tasksPinnedProjects: [PROJECT_ID],
    tasksTabs: [
      {
        id: "saved-project",
        target: { kind: "project", project: PROJECT_ID, view: "overview" },
        preview: false,
        back: [],
        forward: [],
      },
    ],
    activeTasksTabId: "saved-project",
  });

  indexVault(dbPath, root);

  expect(listProjects(dbPath)).toEqual([
    expect.objectContaining({
      id: PROJECT_ID,
      path: relative,
      counts: expect.objectContaining({ todo: 1 }),
    }),
  ]);
  expect(getProject(root, dbPath, PROJECT_ID)).toMatchObject({
    id: PROJECT_ID,
    path: relative,
  });
  expect(listIssues(dbPath).find(({ id }) => id === issue.id)?.project).toBe(
    PROJECT_ID,
  );
  expect(loadSession(dataDir, "vault")).toMatchObject({
    tasksProjectOrder: [PROJECT_ID],
    tasksPinnedProjects: [PROJECT_ID],
    tasksTabs: [
      {
        id: "saved-project",
        target: { kind: "project", project: PROJECT_ID, view: "overview" },
      },
    ],
    activeTasksTabId: "saved-project",
  });

  await deleteProject(root, dbPath, PROJECT_ID, async (file) => {
    fs.rmSync(file);
  });

  expect(listIssues(dbPath).find(({ id }) => id === issue.id)?.project).toBe(
    null,
  );
});
