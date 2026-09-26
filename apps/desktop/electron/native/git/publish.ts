import {
  GIT_COPPER_TEMP_EXCLUDES,
  GIT_FORCE_FLAGS,
  GIT_MERGE_MESSAGE,
  GIT_ORIGIN,
  gitCommitMessage,
} from "./constants";
import { isVaultRootGitRepo } from "./detect";
import { applyKeepBoth } from "./keep-both";
import { GitCommandError, runGit } from "./run";
import { readOriginHost, unsafeGitState } from "./status";
import type { GitFailReason, GitPublishResult, GitRunner } from "./types";

export function pushArgv(setUpstream: boolean): string[] {
  const args = setUpstream
    ? ["push", "-u", GIT_ORIGIN, "HEAD"]
    : ["push", GIT_ORIGIN, "HEAD"];
  assertNoForce(args);
  return args;
}

export function assertNoForce(args: string[]): void {
  for (const flag of GIT_FORCE_FLAGS) {
    if (args.includes(flag)) {
      throw new Error("force-push is not allowed");
    }
  }
}

export async function publishGitVault(
  root: string,
  runner: GitRunner = runGit,
): Promise<GitPublishResult> {
  const detected = await isVaultRootGitRepo(root, runner);
  if (!detected.git) {
    return errorResult("not_git");
  }
  if (detected.reason === "no_git_bin") {
    return errorResult("no_git_bin");
  }

  const startedUnsafe = await unsafeGitState(root, runner);
  if (startedUnsafe) {
    return errorResult(startedUnsafe);
  }

  const branch = await shortBranch(root, runner);
  if (!branch) {
    return errorResult("detached");
  }

  const origin = await runner(root, ["remote", "get-url", GIT_ORIGIN], {
    allowFailure: true,
  });
  if (origin.code !== 0 || !origin.stdout.trim()) {
    return errorResult("no_remote");
  }

  const beforeHead = await revParse(root, runner);
  const host = await readOriginHost(root, runner);
  let startedMerge = false;
  let siblingPaths: string[] = [];

  try {
    const addArgs = ["add", "-A", "--", ".", ...GIT_COPPER_TEMP_EXCLUDES];
    await runner(root, addArgs);

    const staged = await runner(root, ["diff", "--cached", "--quiet"], {
      allowFailure: true,
    });
    if (staged.code !== 0) {
      if (!(await hasIdentity(root, runner))) {
        return errorResult("no_identity");
      }
      const stagedFiles = await nameOnly(
        root,
        ["diff", "--cached", "--name-only"],
        runner,
      );
      await runner(root, [
        "commit",
        "--no-verify",
        "-m",
        gitCommitMessage(Math.max(stagedFiles.length, 1)),
      ]);
    }

    const fetched = await runner(root, ["fetch", GIT_ORIGIN], {
      allowFailure: true,
    });
    if (fetched.code !== 0) {
      return mapRunError(fetched.stderr, fetched.code);
    }

    const mergeTarget = await resolveMergeTarget(root, branch, runner);
    if (mergeTarget) {
      const merged = await runner(
        root,
        ["merge", "--no-commit", "--no-edit", mergeTarget],
        { allowFailure: true },
      );
      startedMerge = await hasMergeHead(root, runner);
      if (merged.code !== 0 && merged.code !== 1) {
        if (startedMerge) {
          await runner(root, ["merge", "--abort"], { allowFailure: true });
        }
        return mapRunError(merged.stderr, merged.code);
      }
      if (merged.code === 1 || (await hasUnmerged(root, runner))) {
        siblingPaths = await applyKeepBoth(root, host, runner);
        if (await hasUnmerged(root, runner)) {
          if (startedMerge) {
            await runner(root, ["merge", "--abort"], { allowFailure: true });
          }
          return errorResult("combine_failed", [], siblingPaths);
        }
      }
      if (await hasMergeHead(root, runner)) {
        if (!(await hasIdentity(root, runner))) {
          if (startedMerge) {
            await runner(root, ["merge", "--abort"], { allowFailure: true });
          }
          return errorResult("no_identity", [], siblingPaths);
        }
        await runner(root, ["commit", "--no-verify", "-m", GIT_MERGE_MESSAGE]);
      }
    }

    const afterHead = await revParse(root, runner);
    const changedPaths = await changedSince(root, beforeHead, runner);
    const ahead = await isAheadOfUpstream(root, runner);
    const hasUpstream = await runner(
      root,
      ["rev-parse", "--abbrev-ref", "@{u}"],
      { allowFailure: true },
    );
    if (ahead || hasUpstream.code !== 0) {
      const args = pushArgv(hasUpstream.code !== 0);
      const pushed = await runner(root, args, { allowFailure: true });
      if (pushed.code !== 0) {
        return mapRunError(
          pushed.stderr,
          pushed.code,
          changedPaths,
          siblingPaths,
        );
      }
      if (siblingPaths.length > 0) {
        return {
          kind: "kept_both",
          changedPaths,
          siblingPaths,
        };
      }
      return { kind: "pushed", changedPaths, siblingPaths };
    }

    if (siblingPaths.length > 0) {
      return { kind: "kept_both", changedPaths, siblingPaths };
    }
    if (beforeHead && afterHead && beforeHead !== afterHead) {
      return { kind: "updated", changedPaths, siblingPaths };
    }
    return { kind: "up_to_date", changedPaths, siblingPaths };
  } catch (error) {
    if (startedMerge) {
      await runner(root, ["merge", "--abort"], { allowFailure: true });
    }
    if (error instanceof GitCommandError) {
      return errorResult(error.reason, [], siblingPaths);
    }
    throw error;
  }
}

function errorResult(
  reason: GitFailReason,
  changedPaths: string[] = [],
  siblingPaths: string[] = [],
): GitPublishResult {
  return { kind: "error", reason, changedPaths, siblingPaths };
}

function mapRunError(
  stderr: string,
  code: number | null,
  changedPaths: string[] = [],
  siblingPaths: string[] = [],
): GitPublishResult {
  if (code === null) {
    return errorResult("timeout", changedPaths, siblingPaths);
  }
  if (
    /authentication|auth fail|permission denied|could not read username|terminal prompts disabled|403|401/i.test(
      stderr,
    )
  ) {
    return errorResult("auth", changedPaths, siblingPaths);
  }
  return errorResult("io", changedPaths, siblingPaths);
}

async function shortBranch(
  root: string,
  runner: GitRunner,
): Promise<string | null> {
  const result = await runner(
    root,
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    { allowFailure: true },
  );
  const branch = result.stdout.trim();
  return result.code === 0 && branch ? branch : null;
}

async function hasIdentity(root: string, runner: GitRunner): Promise<boolean> {
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

async function revParse(
  root: string,
  runner: GitRunner,
): Promise<string | null> {
  const result = await runner(root, ["rev-parse", "HEAD"], {
    allowFailure: true,
  });
  const value = result.stdout.trim();
  return result.code === 0 && value ? value : null;
}

async function resolveMergeTarget(
  root: string,
  branch: string,
  runner: GitRunner,
): Promise<string | null> {
  const upstream = await runner(root, ["rev-parse", "--verify", "@{u}"], {
    allowFailure: true,
  });
  if (upstream.code === 0) {
    return "@{u}";
  }
  const originBranch = await runner(
    root,
    ["rev-parse", "--verify", `${GIT_ORIGIN}/${branch}`],
    { allowFailure: true },
  );
  if (originBranch.code === 0) {
    return `${GIT_ORIGIN}/${branch}`;
  }
  return null;
}

async function hasMergeHead(root: string, runner: GitRunner): Promise<boolean> {
  const result = await runner(root, ["rev-parse", "--verify", "MERGE_HEAD"], {
    allowFailure: true,
  });
  return result.code === 0;
}

async function hasUnmerged(root: string, runner: GitRunner): Promise<boolean> {
  const result = await runner(root, ["ls-files", "-u"], { allowFailure: true });
  return result.code === 0 && result.stdout.trim() !== "";
}

async function isAheadOfUpstream(
  root: string,
  runner: GitRunner,
): Promise<boolean> {
  const result = await runner(root, ["rev-list", "--count", "@{u}..HEAD"], {
    allowFailure: true,
  });
  if (result.code !== 0) {
    return true;
  }
  return (Number.parseInt(result.stdout.trim() || "0", 10) || 0) > 0;
}

async function nameOnly(
  root: string,
  args: string[],
  runner: GitRunner,
): Promise<string[]> {
  const result = await runner(root, args, { allowFailure: true });
  if (result.code !== 0 || !result.stdout.trim()) {
    return [];
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function changedSince(
  root: string,
  beforeHead: string | null,
  runner: GitRunner,
): Promise<string[]> {
  if (!beforeHead) {
    return nameOnly(root, ["ls-tree", "-r", "--name-only", "HEAD"], runner);
  }
  return nameOnly(root, ["diff", "--name-only", beforeHead, "HEAD"], runner);
}
