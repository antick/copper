import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GIT_FORCE_FLAGS } from "./constants";
import {
  FIXTURE_PNG,
  fileExists,
  gitSetup,
  initRepo,
  makeLinkedClones,
  makeTempDir,
  readFile,
  writeFile,
} from "./git-fixture";
import { inspectGitStatus, publishGitVault, pushArgv } from "./index";
import { runGit } from "./run";
import type { GitRunner } from "./types";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function track(dir: string): string {
  const parent = path.dirname(dir);
  if (!temps.includes(parent)) {
    temps.push(parent);
  }
  return dir;
}

function recordingRunner(): { runner: GitRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: GitRunner = async (root, args, options) => {
    calls.push(args);
    return runGit(root, args, options);
  };
  return { runner, calls };
}

describe("publish argv", () => {
  it("never includes force flags", () => {
    expect(pushArgv(false)).toEqual(["push", "origin", "HEAD"]);
    expect(pushArgv(true)).toEqual(["push", "-u", "origin", "HEAD"]);
    for (const args of [pushArgv(false), pushArgv(true)]) {
      for (const flag of GIT_FORCE_FLAGS) {
        expect(args).not.toContain(flag);
      }
    }
  });
});

describe("publishGitVault", () => {
  it("refuses a repository that is already merging", async () => {
    const root = makeTempDir("copper-git-pub-merge-");
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
    spawnFail(root, ["merge", "--no-commit", "other"]);
    const result = await publishGitVault(root);
    expect(result).toMatchObject({ kind: "error", reason: "merging" });
    expect(fs.existsSync(path.join(root, ".git", "MERGE_HEAD"))).toBe(true);
  });

  it("pushes local-only note commits", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(local, "Daily.md", "one\n");
    writeFile(local, "Projects/ideas.md", "two\n");
    const { runner, calls } = recordingRunner();
    const result = await publishGitVault(local, runner);
    expect(result.kind).toBe("pushed");
    gitSetup(remote, ["pull", "--ff-only"]);
    expect(readFile(remote, "Daily.md")).toBe("one\n");
    expect(readFile(remote, "Projects/ideas.md")).toBe("two\n");
    expect(calls.some((args) => args.includes("--force"))).toBe(false);
    expect(calls.some((args) => args.includes("--force-with-lease"))).toBe(
      false,
    );
    expect(calls.some((args) => args.includes("-f"))).toBe(false);
  });

  it("updates from origin without an empty commit", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(remote, "Inbox/todo.md", "- [ ] tea\n");
    gitSetup(remote, ["add", "Inbox/todo.md"]);
    gitSetup(remote, ["commit", "-m", "todo"]);
    gitSetup(remote, ["push"]);
    const before = gitSetup(local, ["rev-list", "--count", "HEAD"]).trim();
    const result = await publishGitVault(local);
    expect(result.kind).toBe("updated");
    expect(fileExists(local, "Inbox/todo.md")).toBe(true);
    const after = gitSetup(local, ["rev-list", "--count", "HEAD"]).trim();
    expect(Number(after)).toBe(Number(before) + 1);
  });

  it("combines different files from both machines", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(remote, "Projects/ideas.md", "ship it\n");
    gitSetup(remote, ["add", "Projects/ideas.md"]);
    gitSetup(remote, ["commit", "-m", "ideas"]);
    gitSetup(remote, ["push"]);
    writeFile(local, "Daily.md", "local daily\n");
    const result = await publishGitVault(local);
    expect(["pushed", "kept_both"]).toContain(result.kind);
    expect(readFile(local, "Daily.md")).toBe("local daily\n");
    expect(readFile(local, "Projects/ideas.md")).toBe("ship it\n");
  });

  it("keeps both versions of overlapping Markdown", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(local, "Daily.md", "base\n");
    gitSetup(local, ["add", "Daily.md"]);
    gitSetup(local, ["commit", "-m", "daily base"]);
    gitSetup(local, ["push"]);
    gitSetup(remote, ["pull", "--ff-only"]);
    writeFile(remote, "Daily.md", "meeting at 4\n");
    gitSetup(remote, ["add", "Daily.md"]);
    gitSetup(remote, ["commit", "-m", "remote daily"]);
    gitSetup(remote, ["push"]);
    writeFile(local, "Daily.md", "meeting at 3\n");
    const result = await publishGitVault(local);
    expect(result.kind).toBe("kept_both");
    expect(readFile(local, "Daily.md")).toBe("meeting at 3\n");
    expect(readFile(local, "Daily (from remote).md")).toBe("meeting at 4\n");
    expect(readFile(local, "Daily.md")).not.toContain("<<<<<<<");
    expect(readFile(local, "Daily (from remote).md")).not.toContain("<<<<<<<");
    expect(fs.existsSync(path.join(local, ".git", "MERGE_HEAD"))).toBe(false);
  });

  it("keeps both versions of an image", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(local, "attachments/photo.png", FIXTURE_PNG.a);
    gitSetup(local, ["add", "attachments/photo.png"]);
    gitSetup(local, ["commit", "-m", "photo local"]);
    writeFile(remote, "attachments/photo.png", FIXTURE_PNG.b);
    gitSetup(remote, ["add", "attachments/photo.png"]);
    gitSetup(remote, ["commit", "-m", "photo remote"]);
    gitSetup(remote, ["push"]);
    const result = await publishGitVault(local);
    expect(result.kind).toBe("kept_both");
    expect(
      fs.readFileSync(path.join(local, "attachments", "photo.png")),
    ).toEqual(FIXTURE_PNG.a);
    expect(fileExists(local, "attachments/photo (from remote).png")).toBe(true);
  });

  it("does not silently restore a locally deleted note", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(local, "Daily.md", "base\n");
    gitSetup(local, ["add", "Daily.md"]);
    gitSetup(local, ["commit", "-m", "daily"]);
    gitSetup(local, ["push"]);
    gitSetup(remote, ["pull", "--ff-only"]);
    writeFile(remote, "Daily.md", "still here\n");
    gitSetup(remote, ["add", "Daily.md"]);
    gitSetup(remote, ["commit", "-m", "edit"]);
    gitSetup(remote, ["push"]);
    gitSetup(local, ["rm", "Daily.md"]);
    gitSetup(local, ["commit", "-m", "delete"]);
    const result = await publishGitVault(local);
    expect(result.kind).toBe("kept_both");
    expect(fileExists(local, "Daily.md")).toBe(false);
    expect(readFile(local, "Daily (from remote).md")).toBe("still here\n");
  });

  it("does not commit Copper temp files", async () => {
    const { local } = makeLinkedClones();
    track(local);
    writeFile(local, "Daily.md", "keep\n");
    writeFile(local, ".Daily.md.copper-tmp", "tmp\n");
    const result = await publishGitVault(local);
    expect(result.kind).toBe("pushed");
    const tracked = gitSetup(local, ["ls-files"]);
    expect(tracked).toContain("Daily.md");
    expect(tracked).not.toContain("copper-tmp");
  });

  it("finishes a Copper merge instead of leaving MERGE_HEAD", async () => {
    const { local, remote } = makeLinkedClones();
    track(local);
    writeFile(local, "Daily.md", "base\n");
    gitSetup(local, ["add", "Daily.md"]);
    gitSetup(local, ["commit", "-m", "base"]);
    gitSetup(local, ["push"]);
    gitSetup(remote, ["pull", "--ff-only"]);
    writeFile(remote, "Daily.md", "theirs\n");
    gitSetup(remote, ["add", "Daily.md"]);
    gitSetup(remote, ["commit", "-m", "theirs"]);
    gitSetup(remote, ["push"]);
    writeFile(local, "Daily.md", "ours\n");
    const result = await publishGitVault(local);
    expect(result.kind).toBe("kept_both");
    expect(fs.existsSync(path.join(local, ".git", "MERGE_HEAD"))).toBe(false);
  });

  it("reports no_remote instead of creating origin", async () => {
    const root = makeTempDir("copper-git-push-noremote-");
    temps.push(root);
    initRepo(root);
    writeFile(root, "note.md", "x\n");
    gitSetup(root, ["add", "note.md"]);
    gitSetup(root, ["commit", "-m", "note"]);
    const result = await publishGitVault(root);
    expect(result).toMatchObject({ kind: "error", reason: "no_remote" });
    const remotes = gitSetup(root, ["remote"]);
    expect(remotes.trim()).toBe("");
  });

  it("counts local dirty notes for status", async () => {
    const { local } = makeLinkedClones();
    track(local);
    writeFile(local, "a.md", "1\n");
    writeFile(local, "b.md", "2\n");
    const status = await inspectGitStatus(local);
    expect(status.kind).toBe("git");
    if (status.kind === "git") {
      expect(status.dirtyCount).toBeGreaterThanOrEqual(2);
      expect(status.noteCount).toBeGreaterThanOrEqual(2);
      expect(status.blockReason).toBeNull();
    }
  });
});

function spawnFail(cwd: string, args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}
