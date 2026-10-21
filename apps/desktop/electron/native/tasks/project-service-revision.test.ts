import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { DOCUMENT_CONFLICT_CODE } from "../../../shared/document-save";
import {
  createProject,
  updateProject,
  updateProjectWorkflow,
} from "./project-service";
import { createIssue } from "./service";
import { DEFAULT_WORKFLOW } from "./workflow";

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function vault() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-project-revision-"),
  );
  temporaryDirectories.push(root);
  return { root, db: path.join(root, "index.db") };
}

function conflictOf(action: () => unknown) {
  let failure: unknown;
  try {
    action();
  } catch (error) {
    failure = error;
  }
  expect(failure).toMatchObject({ code: DOCUMENT_CONFLICT_CODE });
}

it("preserves an external edit during a project update", () => {
  const { root, db } = vault();
  const project = createProject(root, db, { name: "Revision check" });
  const file = path.join(root, project.path);
  const external = `${fs.readFileSync(file, "utf8")}\nExternal project edit.\n`;
  const original = fs.fsyncSync;
  vi.spyOn(fs, "fsyncSync").mockImplementation((fd) => {
    original(fd);
    fs.writeFileSync(file, external);
  });

  conflictOf(() => updateProject(root, db, project.id, { icon: "rocket" }));
  expect(fs.readFileSync(file, "utf8")).toBe(external);
});

it.each(["edit", "delete"] as const)(
  "keeps an external issue %s and the project failure during rollback",
  (change) => {
    const { root, db } = vault();
    const review = {
      id: "rollback--review",
      label: "Review",
      category: "started" as const,
    };
    const project = createProject(root, db, {
      name: "Rollback",
      workflow: [DEFAULT_WORKFLOW[0], review, ...DEFAULT_WORKFLOW.slice(1)],
    });
    const issue = createIssue(root, db, {
      title: "In review",
      project: project.id,
      status: review.id,
    });
    const issuePath = path.join(root, issue.path);
    const originalRename = fs.renameSync;
    const originalSync = fs.fsyncSync;
    let renameCount = 0;
    let syncCount = 0;
    vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      const result = originalRename(from, to);
      renameCount += 1;
      if (change === "edit" && renameCount === 1) {
        fs.appendFileSync(issuePath, "\nExternal issue edit.\n");
      }
      return result;
    });
    vi.spyOn(fs, "fsyncSync").mockImplementation((fd) => {
      originalSync(fd);
      syncCount += 1;
      if (syncCount === 2) {
        if (change === "delete") fs.unlinkSync(issuePath);
        throw new Error("Project save failed");
      }
    });

    let failure: unknown;
    try {
      updateProjectWorkflow(root, db, project.id, {
        workflow: DEFAULT_WORKFLOW,
        archivedStatusId: review.id,
        fallbackStatusId: "todo",
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: "io" });
    expect((failure as Error).message).toContain("Project save failed");
    if (change === "edit") {
      expect(fs.readFileSync(issuePath, "utf8")).toContain(
        "External issue edit.",
      );
      expect(fs.readFileSync(issuePath, "utf8")).toContain("status: todo");
    } else {
      expect(fs.existsSync(issuePath)).toBe(false);
    }
  },
);
