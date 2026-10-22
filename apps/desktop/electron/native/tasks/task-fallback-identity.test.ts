import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { restoreFile } from "../files/service";
import { indexVault } from "../index/indexer";
import { getProject, listProjects, updateProject } from "./project-service";
import { getIssue, listIssues, updateIssue } from "./service";

const vaults: string[] = [];

afterEach(() => {
  for (const root of vaults.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeVault(): { root: string; dbPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-task-fallback-"));
  vaults.push(root);
  return { root, dbPath: path.join(root, "index.db") };
}

function writeTask(
  root: string,
  relative: string,
  kind: "issue" | "project",
  id?: string,
): void {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const identity = id === undefined ? "" : `id: ${id}\n`;
  fs.writeFileSync(
    absolute,
    `---\ntype: ${kind}\n${identity}status: ${kind === "project" ? "planned" : "todo"}\n---\n# Original title\n`,
  );
}

describe("task fallback identity", () => {
  it.each([
    ["Research Plan.md", "research-plan"],
    ["RESEARCH Plan.MARKDOWN", "research-plan"],
    ["Über Café.Markdown", "ber-caf"],
  ])("indexes and reads ID-less project %s as %s", (filename, expectedId) => {
    const { root, dbPath } = makeVault();
    const relative = `.copper/tasks/projects/${filename}`;
    writeTask(root, relative, "project");
    indexVault(dbPath, root);

    const listed = listProjects(dbPath).find(
      (project) => project.path === relative,
    );
    expect(listed?.id).toBe(expectedId);
    expect(getProject(root, dbPath, expectedId)).toMatchObject({
      id: expectedId,
      path: relative,
    });
    expect(
      updateProject(root, dbPath, expectedId, { title: "Renamed" }),
    ).toMatchObject({ id: expectedId, title: "Renamed", path: relative });
  });

  it("keeps an ID-less restored project listable and openable", () => {
    const { root, dbPath } = makeVault();
    const archived = ".copper/tasks/archive/projects/Research Plan.md";
    writeTask(root, archived, "project");

    const restored = restoreFile(root, archived);
    indexVault(dbPath, root);

    expect(restored).toBe(".copper/tasks/projects/Research Plan.md");
    expect(listProjects(dbPath)[0]?.id).toBe("research-plan");
    expect(getProject(root, dbPath, "research-plan").path).toBe(restored);
  });

  it.each([
    "Research/Planning/Research Plan.md",
    "Archive/Research/Planning/Research Plan.md",
  ])(
    "uses the same project fallback outside managed folders: %s",
    (relative) => {
      const { root, dbPath } = makeVault();
      writeTask(root, relative, "project");
      indexVault(dbPath, root);

      const listed = listProjects(dbPath).find(
        (project) => project.path === relative,
      );
      expect(listed?.id).toBe("research-plan");
      expect(getProject(root, dbPath, "research-plan")).toMatchObject({
        id: "research-plan",
        path: relative,
      });
    },
  );

  it("blocks restoring an ID-less project with a matching fallback identity", () => {
    const { root } = makeVault();
    const active = ".copper/tasks/projects/Research Plan.md";
    const archived = ".copper/tasks/archive/projects/RESEARCH_PLAN.markdown";
    writeTask(root, active, "project");
    writeTask(root, archived, "project");

    expect(() => restoreFile(root, archived)).toThrow(
      "because it is already active",
    );
    expect(fs.existsSync(path.join(root, active))).toBe(true);
    expect(fs.existsSync(path.join(root, archived))).toBe(true);
  });

  it("uses the discovered issue ID when indexing an ID-less managed issue", () => {
    const { root, dbPath } = makeVault();
    writeTask(root, ".copper/tasks/issues/ISSUE-17-title.md", "issue");
    indexVault(dbPath, root);

    const listed = listIssues(dbPath)[0];
    expect(listed?.id).toBe("ISSUE-17");
    expect(getIssue(root, "ISSUE-17").path).toBe(
      ".copper/tasks/issues/ISSUE-17-title.md",
    );
  });

  it("returns the indexed fallback ID when reading an ID-less issue", () => {
    const { root, dbPath } = makeVault();
    writeTask(root, ".copper/tasks/issues/ISSUE-17-title.md", "issue");
    indexVault(dbPath, root);

    const listed = listIssues(dbPath)[0];
    if (!listed) throw new Error("Expected the ID-less issue to be indexed");
    expect(listed.id).toBe("ISSUE-17");
    expect(getIssue(root, listed.id).id).toBe(listed.id);
  });

  it("updates an ID-less issue by its listed fallback ID", () => {
    const { root, dbPath } = makeVault();
    writeTask(root, ".copper/tasks/issues/ISSUE-17-title.md", "issue");
    indexVault(dbPath, root);

    const listed = listIssues(dbPath)[0];
    if (!listed) throw new Error("Expected the ID-less issue to be indexed");
    expect(listed.id).toBe("ISSUE-17");
    const updated = updateIssue(root, dbPath, listed.id, {
      title: "Updated title",
    });

    expect(updated).toMatchObject({ id: listed.id, title: "Updated title" });
    expect(fs.readFileSync(path.join(root, listed.path), "utf8")).toContain(
      "id: ISSUE-17",
    );
  });

  it("preserves explicit project IDs exactly", () => {
    const { root, dbPath } = makeVault();
    writeTask(root, ".copper/tasks/projects/team.md", "project", "Team");
    indexVault(dbPath, root);

    expect(listProjects(dbPath)[0]?.id).toBe("Team");
    expect(getProject(root, dbPath, "Team").id).toBe("Team");
  });
});
