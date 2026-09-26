import fs from "node:fs";
import path from "node:path";
import { GitCommandError, runGit } from "./run";
import type { GitRunner } from "./types";

export function hasVaultRootGit(root: string): boolean {
  return fs.existsSync(path.join(root, ".git"));
}

export async function isVaultRootGitRepo(
  root: string,
  runner: GitRunner = runGit,
): Promise<{ git: boolean; reason?: "no_git_bin" }> {
  if (!hasVaultRootGit(root)) {
    return { git: false };
  }
  try {
    const result = await runner(root, ["rev-parse", "--show-toplevel"]);
    const top = realExisting(result.stdout.trim());
    const vault = realExisting(root);
    return { git: Boolean(top && vault && top === vault) };
  } catch (error) {
    if (error instanceof GitCommandError && error.reason === "no_git_bin") {
      return { git: true, reason: "no_git_bin" };
    }
    return { git: false };
  }
}

function realExisting(target: string): string | undefined {
  try {
    return fs.realpathSync(target);
  } catch {
    return undefined;
  }
}
