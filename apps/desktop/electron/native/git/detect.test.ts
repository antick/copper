import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { gitSetup, initRepo, makeTempDir, writeFile } from "./git-fixture";
import { hasVaultRootGit, inspectGitStatus, isVaultRootGitRepo } from "./index";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Vault-root Git detection", () => {
  it("treats a Vault-root .git as a Git Vault", async () => {
    const root = makeTempDir("copper-git-root-");
    temps.push(root);
    initRepo(root);
    writeFile(root, "note.md", "# Hi\n");
    gitSetup(root, ["add", "note.md"]);
    gitSetup(root, ["commit", "-m", "note"]);
    expect(hasVaultRootGit(root)).toBe(true);
    await expect(isVaultRootGitRepo(root)).resolves.toEqual({ git: true });
    const status = await inspectGitStatus(root);
    expect(status.kind).toBe("git");
  });

  it("ignores Git that only exists in a parent folder", async () => {
    const parent = makeTempDir("copper-git-parent-");
    temps.push(parent);
    initRepo(parent);
    const vault = path.join(parent, "work");
    fs.mkdirSync(vault);
    writeFile(vault, "note.md", "# Nested vault\n");
    expect(hasVaultRootGit(vault)).toBe(false);
    await expect(isVaultRootGitRepo(vault)).resolves.toEqual({ git: false });
    await expect(inspectGitStatus(vault)).resolves.toEqual({ kind: "not_git" });
  });

  it("ignores a nested .git under a subfolder", async () => {
    const vault = makeTempDir("copper-git-nested-");
    temps.push(vault);
    const nested = path.join(vault, "vendor", "lib");
    fs.mkdirSync(nested, { recursive: true });
    initRepo(nested);
    expect(hasVaultRootGit(vault)).toBe(false);
    await expect(isVaultRootGitRepo(vault)).resolves.toEqual({ git: false });
  });

  it("does not write a .copper sidecar when inspecting Git", async () => {
    const root = makeTempDir("copper-git-sidecar-");
    temps.push(root);
    initRepo(root);
    await inspectGitStatus(root);
    expect(fs.existsSync(path.join(root, ".copper"))).toBe(false);
  });

  it("reports no_remote when origin is missing", async () => {
    const root = makeTempDir("copper-git-noremote-");
    temps.push(root);
    initRepo(root);
    writeFile(root, "note.md", "a\n");
    gitSetup(root, ["add", "note.md"]);
    gitSetup(root, ["commit", "-m", "note"]);
    const status = await inspectGitStatus(root);
    expect(status).toMatchObject({ kind: "git", blockReason: "no_remote" });
  });

  it("reports detached HEAD", async () => {
    const root = makeTempDir("copper-git-detach-");
    temps.push(root);
    initRepo(root);
    writeFile(root, "note.md", "a\n");
    gitSetup(root, ["add", "note.md"]);
    gitSetup(root, ["commit", "-m", "note"]);
    gitSetup(root, ["checkout", "--detach"]);
    const status = await inspectGitStatus(root);
    expect(status).toMatchObject({ kind: "git", blockReason: "detached" });
  });

  it("reports an in-progress merge", async () => {
    const root = makeTempDir("copper-git-merge-");
    temps.push(root);
    initRepo(root);
    writeFile(root, "Daily.md", "base\n");
    gitSetup(root, ["add", "Daily.md"]);
    gitSetup(root, ["commit", "-m", "base"]);
    gitSetup(root, ["checkout", "-b", "other"]);
    writeFile(root, "Daily.md", "other\n");
    gitSetup(root, ["add", "Daily.md"]);
    gitSetup(root, ["commit", "-m", "other"]);
    gitSetup(root, ["checkout", "main"]);
    writeFile(root, "Daily.md", "main\n");
    gitSetup(root, ["add", "Daily.md"]);
    gitSetup(root, ["commit", "-m", "main"]);
    const merge = gitSetupAllowFail(root, ["merge", "--no-commit", "other"]);
    expect(merge).not.toBe(0);
    const status = await inspectGitStatus(root);
    expect(status).toMatchObject({ kind: "git", blockReason: "merging" });
  });
});

function gitSetupAllowFail(cwd: string, args: string[]): number {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status ?? 1;
}
