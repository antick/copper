import fs from "node:fs";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { inspectGitDiff } from "./diff";
import { gitSetup, initRepo, makeTempDir, writeFile } from "./git-fixture";
import { inspectGitStatus } from "./status";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

it("does not execute the configured external fsmonitor", async () => {
  const root = makeTempDir("copper-git-security-");
  roots.push(root);
  initRepo(root);
  writeFile(root, "note.md", "safe note");
  const hook = path.join(root, "monitor");
  fs.writeFileSync(
    hook,
    '#!/bin/sh\nprintf benign > "./executed"\nprintf "\\0"\n',
    { mode: 0o700 },
  );
  gitSetup(root, ["config", "core.fsmonitor", hook]);
  await inspectGitStatus(root);
  expect(fs.existsSync(path.join(root, "executed"))).toBe(false);
}, 30_000);

it("disables external diff and textconv programs", async () => {
  const root = makeTempDir("copper-diff-security-");
  roots.push(root);
  initRepo(root);
  writeFile(root, "note.md", "before");
  writeFile(root, ".gitattributes", "*.md diff=custom\n");
  gitSetup(root, ["add", "."]);
  gitSetup(root, ["commit", "-m", "fixture"]);
  const hook = path.join(root, "converter");
  fs.writeFileSync(hook, '#!/bin/sh\nprintf benign > "./executed"\n', {
    mode: 0o700,
  });
  gitSetup(root, ["config", "diff.external", hook]);
  gitSetup(root, ["config", "diff.custom.textconv", hook]);
  writeFile(root, "note.md", "after");
  const result = await inspectGitDiff(root, "note.md");
  expect(result.text).toContain("after");
  expect(fs.existsSync(path.join(root, "executed"))).toBe(false);
}, 30_000);
