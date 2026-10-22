import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { getProject, listProjects } from "../tasks/project-service";
import { getIssue, listIssues } from "../tasks/service";
import { openIndex } from "./db";
import { indexVault } from "./indexer";

const roots: string[] = [];
const LEGACY_TASK_IDENTITY_SCHEMA_VERSION = 3;

afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

it.each([
  ["project", "Research Plan", "research-plan", "Research Plan"],
  ["issue", "ISSUE-17-title", "ISSUE-17-title", "ISSUE-17"],
] as const)(
  "refreshes unchanged %s identities cached by schema 3",
  (kind, stem, cachedId, id) => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "copper-identity-cache-"),
    );
    roots.push(root);
    const dbPath = path.join(root, "index.db");
    const relative = `.copper/tasks/${kind === "project" ? "projects" : "issues"}/${stem}.md`;
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const source = `---\ntype: ${kind}\n---\n# Preserved contents\n`;
    fs.writeFileSync(absolute, source);
    indexVault(dbPath, root);
    const db = openIndex(dbPath);
    db.prepare("UPDATE tasks SET id = ? WHERE path = ?").run(
      cachedId,
      relative,
    );
    db.pragma(`user_version = ${LEGACY_TASK_IDENTITY_SCHEMA_VERSION}`);
    db.close();

    indexVault(dbPath, root);

    if (kind === "project") {
      expect(listProjects(dbPath)[0]?.id).toBe(id);
      expect(getProject(root, dbPath, id).id).toBe(id);
    } else {
      expect(listIssues(dbPath)[0]?.id).toBe(id);
      expect(getIssue(root, id).id).toBe(id);
    }
    expect(fs.readFileSync(absolute, "utf8")).toBe(source);
  },
);
