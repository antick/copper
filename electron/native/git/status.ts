import fs from "node:fs";
import path from "node:path";
import { GIT_ORIGIN } from "./constants";
import { isVaultRootGitRepo } from "./detect";
import { originHostKind } from "./host";
import { runGit } from "./run";
import type {
  GitBlockReason,
  GitHostKind,
  GitRunner,
  GitStatus,
} from "./types";

export async function inspectGitStatus(
  root: string,
  runner: GitRunner = runGit,
): Promise<GitStatus> {
  const detected = await isVaultRootGitRepo(root, runner);
  if (!detected.git) {
    return { kind: "not_git" };
  }
  if (detected.reason === "no_git_bin") {
    return gitSnapshot({
      blockReason: "no_git_bin",
    });
  }

  const unsafe = await unsafeGitState(root, runner);
  const origin = await originUrl(root, runner);
  const host = origin ? originHostKind(origin) : "remote";
  const identity = await hasCommitIdentity(root, runner);
  const branch = await currentBranch(root, runner);
  const detached = branch === null;
  const { ahead, behind } = await aheadBehind(root, runner);
  const dirtyPaths = await porcelainPaths(root, runner);
  const unpushedPaths = await unpushedPathsFor(root, runner);
  const paths = uniquePaths([...dirtyPaths, ...unpushedPaths]);
  const noteCount = paths.length;

  let blockReason: GitBlockReason | null = unsafe;
  if (!blockReason && detached) {
    blockReason = "detached";
  }
  if (!blockReason && !origin) {
    blockReason = "no_remote";
  }
  if (!blockReason && !identity && dirtyPaths.length > 0) {
    blockReason = "no_identity";
  }

  return gitSnapshot({
    branch,
    host,
    dirtyCount: dirtyPaths.length,
    ahead,
    behind,
    noteCount,
    paths,
    blockReason,
  });
}

function gitSnapshot(partial: {
  branch?: string | null;
  host?: GitHostKind;
  dirtyCount?: number;
  ahead?: number;
  behind?: number;
  noteCount?: number;
  paths?: string[];
  blockReason: GitBlockReason | null;
}): GitStatus {
  return {
    kind: "git",
    branch: partial.branch ?? null,
    host: partial.host ?? "remote",
    dirtyCount: partial.dirtyCount ?? 0,
    ahead: partial.ahead ?? 0,
    behind: partial.behind ?? 0,
    noteCount: partial.noteCount ?? 0,
    paths: partial.paths ?? [],
    blockReason: partial.blockReason,
  };
}

async function gitPathExists(
  root: string,
  gitPath: string,
  runner: GitRunner,
): Promise<boolean> {
  const result = await runner(root, ["rev-parse", "--git-path", gitPath], {
    allowFailure: true,
  });
  if (result.code !== 0) {
    return false;
  }
  const resolved = result.stdout.trim();
  if (!resolved) {
    return false;
  }
  const absolute = path.isAbsolute(resolved)
    ? resolved
    : path.join(root, resolved);
  return fs.existsSync(absolute);
}

export async function unsafeGitState(
  root: string,
  runner: GitRunner = runGit,
): Promise<GitBlockReason | null> {
  if (await gitPathExists(root, "MERGE_HEAD", runner)) {
    return "merging";
  }
  if (
    (await gitPathExists(root, "rebase-merge", runner)) ||
    (await gitPathExists(root, "rebase-apply", runner))
  ) {
    return "rebase";
  }
  if (await gitPathExists(root, "CHERRY_PICK_HEAD", runner)) {
    return "cherry_pick";
  }
  if (await gitPathExists(root, "REVERT_HEAD", runner)) {
    return "revert";
  }
  return null;
}

async function originUrl(
  root: string,
  runner: GitRunner,
): Promise<string | null> {
  const result = await runner(root, ["remote", "get-url", GIT_ORIGIN], {
    allowFailure: true,
  });
  if (result.code !== 0) {
    return null;
  }
  const url = result.stdout.trim();
  return url.length > 0 ? url : null;
}

async function hasCommitIdentity(
  root: string,
  runner: GitRunner,
): Promise<boolean> {
  const name = await runner(root, ["config", "--get", "user.name"], {
    allowFailure: true,
  });
  const email = await runner(root, ["config", "--get", "user.email"], {
    allowFailure: true,
  });
  return (
    name.code === 0 &&
    name.stdout.trim() !== "" &&
    email.code === 0 &&
    email.stdout.trim() !== ""
  );
}

async function currentBranch(
  root: string,
  runner: GitRunner,
): Promise<string | null> {
  const result = await runner(
    root,
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    {
      allowFailure: true,
    },
  );
  if (result.code !== 0) {
    return null;
  }
  const branch = result.stdout.trim();
  return branch.length > 0 ? branch : null;
}

async function aheadBehind(
  root: string,
  runner: GitRunner,
): Promise<{ ahead: number; behind: number }> {
  const result = await runner(
    root,
    ["rev-list", "--left-right", "--count", "HEAD...@{u}"],
    { allowFailure: true },
  );
  if (result.code !== 0) {
    return { ahead: 0, behind: 0 };
  }
  const [aheadRaw, behindRaw] = result.stdout.trim().split(/\s+/);
  return {
    ahead: Number.parseInt(aheadRaw ?? "0", 10) || 0,
    behind: Number.parseInt(behindRaw ?? "0", 10) || 0,
  };
}

async function porcelainPaths(
  root: string,
  runner: GitRunner,
): Promise<string[]> {
  const result = await runner(root, ["status", "--porcelain", "-uall"], {
    allowFailure: true,
  });
  if (result.code !== 0 || !result.stdout.trim()) {
    return [];
  }
  return result.stdout
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

async function unpushedPathsFor(
  root: string,
  runner: GitRunner,
): Promise<string[]> {
  const result = await runner(root, ["diff", "--name-only", "@{u}...HEAD"], {
    allowFailure: true,
  });
  if (result.code !== 0 || !result.stdout.trim()) {
    return [];
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

export async function readOriginHost(
  root: string,
  runner: GitRunner = runGit,
): Promise<GitHostKind> {
  const url = await originUrl(root, runner);
  return url ? originHostKind(url) : "remote";
}
