import fs from "node:fs";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { gitSetup, makeLinkedClones, writeFile } from "../git/git-fixture";
import { publishGitVault } from "../git/index";
import { indexVault } from "../index/indexer";
import { getIssue } from "./service";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

it("pushes migrated hidden task sources and subsequent edits and deletions", async () => {
  const { local, bare } = makeLinkedClones();
  const parent = path.dirname(local);
  temps.push(parent);
  const source =
    "---\ntype: issue\nid: ISSUE-4\nstatus: todo\nrank: a0\n---\n# Git task\n";
  writeFile(local, "Tasks/Issues/ISSUE-4-git.md", source);
  gitSetup(local, ["add", "."]);
  gitSetup(local, ["commit", "-m", "legacy task"]);
  gitSetup(local, ["push"]);
  indexVault(path.join(parent, "index.db"), local);
  const task = getIssue(local, "ISSUE-4");
  const migration = await publishGitVault(local);
  expect(migration.kind).not.toBe("error");
  expect(gitSetup(bare, ["show", `main:${task.path}`])).toBe(source);
  expect(
    gitSetup(bare, ["ls-tree", "-r", "--name-only", "main"]),
  ).not.toContain("Tasks/Issues/");
  writeFile(local, task.path, source.replace("Git task", "Edited source"));
  expect((await publishGitVault(local)).kind).not.toBe("error");
  expect(gitSetup(bare, ["show", `main:${task.path}`])).toContain(
    "Edited source",
  );
  fs.unlinkSync(path.join(local, task.path));
  expect((await publishGitVault(local)).kind).not.toBe("error");
  expect(
    gitSetup(bare, ["ls-tree", "-r", "--name-only", "main"]),
  ).not.toContain(task.path);
});
