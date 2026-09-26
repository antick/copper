import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  updateProjectWorkflow,
} from "./project-service";
import { createIssue, listIssues } from "./service";
import { DEFAULT_WORKFLOW, parseWorkflow, projectIcon } from "./workflow";

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function vault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-projects-"));
  temporaryDirectories.push(root);
  return { root, db: path.join(root, "index.db") };
}

function workflow(projectId: string) {
  return [
    DEFAULT_WORKFLOW[0],
    {
      id: `${projectId}--review`,
      label: "Review",
      category: "started" as const,
    },
    ...DEFAULT_WORKFLOW.slice(1),
  ];
}

describe("project task persistence", () => {
  it("upgrades legacy workflows and accepts emoji while replacing the old default", () => {
    const legacy = [
      DEFAULT_WORKFLOW[0],
      {
        id: "alpha--qa",
        label: "QA",
        category: "started" as const,
        hidden: true,
      },
      ...DEFAULT_WORKFLOW.slice(1).filter(({ id }) => id !== "in_review"),
    ];
    expect(parseWorkflow("alpha", legacy)).toEqual([
      legacy[0],
      legacy[1],
      legacy[2],
      DEFAULT_WORKFLOW[2],
      ...legacy.slice(3),
    ]);
    expect(projectIcon("target")).toBe("folder");
    expect(projectIcon("shapes")).toBe("folder");
    expect(projectIcon("lucide:shapes")).toBe("lucide:shapes");
    expect(projectIcon("emoji:👩🏽‍💻")).toBe("emoji:👩🏽‍💻");
    expect(projectIcon("emoji:not-an-emoji")).toBe("folder");
  });

  it("defaults legacy metadata and migrates a populated custom column", () => {
    const { root, db } = vault();
    const project = createProject(root, db, { name: "Alpha" });
    expect(project.icon).toBe("folder");
    expect(project.workflow).toEqual(DEFAULT_WORKFLOW);
    updateProjectWorkflow(root, db, project.id, {
      workflow: workflow(project.id),
    });
    const issue = createIssue(root, db, {
      title: "Review me",
      project: project.id,
      status: "alpha--review",
    });
    expect(issue.status).toBe("alpha--review");

    updateProjectWorkflow(root, db, project.id, {
      workflow: DEFAULT_WORKFLOW,
      archivedStatusId: "alpha--review",
      fallbackStatusId: "todo",
    });
    expect(listIssues(db).find((item) => item.id === issue.id)?.status).toBe(
      "todo",
    );
  });

  it("rejects malformed and non-namespaced workflow columns", () => {
    const { root, db } = vault();
    expect(() =>
      createProject(root, db, {
        name: "Alpha",
        workflow: [
          ...DEFAULT_WORKFLOW,
          { id: "review", label: "Review", category: "started" },
        ],
      }),
    ).toThrow("Project workflow is invalid");
  });

  it("hides a populated column without touching the issue file", () => {
    const { root, db } = vault();
    const project = createProject(root, db, { name: "Alpha" });
    const issue = createIssue(root, db, {
      title: "Review me",
      project: project.id,
      status: "in_review",
    });
    const issuePath = path.join(root, issue.path);
    const before = fs.readFileSync(issuePath, "utf8");
    const workflow = DEFAULT_WORKFLOW.map((column) =>
      column.id === "in_review" ? { ...column, hidden: true } : column,
    );
    const updated = updateProjectWorkflow(root, db, project.id, { workflow });
    expect(updated.workflow.find(({ id }) => id === "in_review")?.hidden).toBe(
      true,
    );
    expect(fs.readFileSync(issuePath, "utf8")).toBe(before);
    expect(listIssues(db)[0]?.status).toBe("in_review");
  });

  it("rolls issue and project files back when the project workflow write fails", () => {
    const { root, db } = vault();
    const project = createProject(root, db, {
      name: "Alpha",
      workflow: workflow("alpha"),
    });
    const issue = createIssue(root, db, {
      title: "Review me",
      project: project.id,
      status: "alpha--review",
    });
    const before = fs.readFileSync(path.join(root, issue.path), "utf8");
    const rename = fs.renameSync;
    let writes = 0;
    const failure = vi
      .spyOn(fs, "renameSync")
      .mockImplementation((from, to) => {
        writes += 1;
        if (writes === 2) throw new Error("Project write failed");
        return rename(from, to);
      });
    expect(() =>
      updateProjectWorkflow(root, db, project.id, {
        workflow: DEFAULT_WORKFLOW,
        archivedStatusId: "alpha--review",
        fallbackStatusId: "todo",
      }),
    ).toThrow("Project write failed");
    failure.mockRestore();
    expect(fs.readFileSync(path.join(root, issue.path), "utf8")).toBe(before);
    expect(listIssues(db)[0]?.status).toBe("alpha--review");
    expect(getProject(root, project.id).workflow).toEqual(workflow("alpha"));
  });

  it("persists icon and rename updates without changing identity or extra metadata", () => {
    const { root, db } = vault();
    const project = createProject(root, db, { name: "Alpha" });
    const absolute = path.join(root, project.path);
    fs.writeFileSync(
      absolute,
      fs
        .readFileSync(absolute, "utf8")
        .replace("type: project", "type: project\nowner: team"),
    );
    const updated = updateProject(root, db, project.id, {
      title: "Alpha renamed",
      icon: "rocket",
    });
    expect(updated).toMatchObject({
      id: project.id,
      path: project.path,
      title: "Alpha renamed",
      icon: "rocket",
    });
    expect(fs.readFileSync(absolute, "utf8")).toContain("owner: team");
  });

  it("archives a project without changing issue references", () => {
    const { root, db } = vault();
    const project = createProject(root, db, { name: "Alpha" });
    createIssue(root, db, { title: "Keep me", project: project.id });
    archiveProject(root, db, project.id);
    expect(getProject(root, project.id).archived).toBe(true);
    expect(
      listProjects(db).find((item) => item.id === project.id)?.archived,
    ).toBe(true);
    expect(listIssues(db)[0]?.project).toBe(project.id);
  });

  it("deletes a project, unassigns issues, and resets only custom statuses", async () => {
    const { root, db } = vault();
    const project = createProject(root, db, {
      name: "Alpha",
      workflow: workflow("alpha"),
    });
    createIssue(root, db, {
      title: "Custom",
      project: project.id,
      status: "alpha--review",
    });
    createIssue(root, db, {
      title: "Canceled",
      project: project.id,
      status: "canceled",
    });
    await deleteProject(root, db, project.id, async (absolute) => {
      fs.rmSync(absolute);
    });
    expect(listProjects(db)).toEqual([]);
    expect(
      listIssues(db).map(({ project: owner, status }) => ({ owner, status })),
    ).toEqual([
      { owner: null, status: "todo" },
      { owner: null, status: "canceled" },
    ]);
  });

  it("restores issue bytes and index state when Trash fails", async () => {
    const { root, db } = vault();
    const project = createProject(root, db, {
      name: "Alpha",
      workflow: workflow("alpha"),
    });
    const issue = createIssue(root, db, {
      title: "Keep bytes",
      project: project.id,
      status: "alpha--review",
    });
    const projectBefore = fs.readFileSync(
      path.join(root, project.path),
      "utf8",
    );
    const before = fs.readFileSync(path.join(root, issue.path), "utf8");
    await expect(
      deleteProject(root, db, project.id, async (absolute) => {
        fs.rmSync(absolute);
        throw new Error("Trash unavailable");
      }),
    ).rejects.toThrow("Trash unavailable");
    expect(fs.readFileSync(path.join(root, project.path), "utf8")).toBe(
      projectBefore,
    );
    expect(fs.readFileSync(path.join(root, issue.path), "utf8")).toBe(before);
    expect(listProjects(db).map((item) => item.id)).toEqual([project.id]);
    expect(listIssues(db)[0]).toMatchObject({
      project: project.id,
      status: "alpha--review",
    });
  });
});
