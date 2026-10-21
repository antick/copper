import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCUMENT_CONFLICT_CODE } from "../../../shared/document-save";
import {
  addIssueComment,
  createIssue,
  deleteIssueComment,
  moveIssue,
  updateIssue,
  updateIssueComment,
} from "./service";

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function vault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-task-revision-"));
  temporaryDirectories.push(root);
  return { root, db: path.join(root, "index.db") };
}

function externalEditOnSync(target: string, contents: string) {
  const original = fs.fsyncSync;
  return vi.spyOn(fs, "fsyncSync").mockImplementation((fd) => {
    original(fd);
    fs.writeFileSync(target, contents);
  });
}

function expectConflict(action: () => unknown) {
  let failure: unknown;
  try {
    action();
  } catch (error) {
    failure = error;
  }
  expect(failure).toMatchObject({ code: DOCUMENT_CONFLICT_CODE });
}

describe("task revision guards", () => {
  const mutations: Array<
    [
      string,
      (root: string, db: string, id: string, commentId: string) => unknown,
    ]
  > = [
    [
      "issue fields",
      (root, db, id) => updateIssue(root, db, id, { priority: "high" }),
    ],
    [
      "new comments",
      (root, db, id) => addIssueComment(root, db, id, "New comment"),
    ],
    [
      "edited comments",
      (root, db, id, commentId) =>
        updateIssueComment(root, db, id, commentId, "Edited comment"),
    ],
    [
      "deleted comments",
      (root, db, id, commentId) => deleteIssueComment(root, db, id, commentId),
    ],
  ];

  it.each(mutations)(
    "preserves an external edit during %s",
    (_name, mutate) => {
      const { root, db } = vault();
      const issue = createIssue(root, db, { title: "Revision check" });
      const commented = addIssueComment(root, db, issue.id, "Original comment");
      const commentId = commented.comments?.[0]?.id ?? "";
      const file = path.join(root, issue.path);
      const external = `${fs.readFileSync(file, "utf8")}\nExternal edit to preserve.\n`;
      externalEditOnSync(file, external);

      expectConflict(() => mutate(root, db, issue.id, commentId));
      expect(fs.readFileSync(file, "utf8")).toBe(external);
    },
  );

  it("does not overwrite external edits while rolling back rank repairs", () => {
    const { root, db } = vault();
    const first = createIssue(root, db, { title: "First" });
    const moved = createIssue(root, db, { title: "Moved" });
    updateIssue(root, db, first.id, { rank: "0" });
    const firstPath = path.join(root, first.path);
    const movedPath = path.join(root, moved.path);
    const originalSync = fs.fsyncSync;
    let syncCount = 0;
    vi.spyOn(fs, "fsyncSync").mockImplementation((fd) => {
      originalSync(fd);
      syncCount += 1;
      if (syncCount === 2) {
        fs.appendFileSync(firstPath, "\nExternal rank edit.\n");
        fs.appendFileSync(movedPath, "\nExternal move edit.\n");
      }
    });

    expectConflict(() => moveIssue(root, db, moved.id, { beforeId: first.id }));
    expect(fs.readFileSync(firstPath, "utf8")).toContain("External rank edit.");
    expect(fs.readFileSync(movedPath, "utf8")).toContain("External move edit.");
  });
});
