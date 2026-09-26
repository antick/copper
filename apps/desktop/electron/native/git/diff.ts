import fs from "node:fs";
import { normalizeRelative, resolveInVault } from "../path";
import { GIT_DIFF_MAX_BYTES } from "./constants";
import { runGit } from "./run";
import type { GitDiff, GitRunner } from "./types";

export async function inspectGitDiff(
  root: string,
  requested: string,
  runner: GitRunner = runGit,
): Promise<GitDiff> {
  const relative = normalizeRelative(requested);
  resolveInVault(root, relative);

  const tracked = await runner(root, ["ls-files", "--", relative], {
    allowFailure: true,
  });
  const isTracked = tracked.code === 0 && tracked.stdout.trim().length > 0;

  if (!isTracked) {
    const abs = resolveInVault(root, relative);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return { path: relative, text: "", binary: false };
    }
    const bytes = fs.readFileSync(abs);
    if (bytes.includes(0) || bytes.byteLength > GIT_DIFF_MAX_BYTES) {
      return { path: relative, text: null, binary: true };
    }
    const body = bytes.toString("utf8");
    return {
      path: relative,
      text: `--- /dev/null\n+++ b/${relative}\n${body
        .split("\n")
        .map((line) => `+${line}`)
        .join("\n")}`,
      binary: false,
    };
  }

  const result = await runner(
    root,
    ["diff", "--no-ext-diff", "--no-textconv", "HEAD", "--", relative],
    {
      allowFailure: true,
    },
  );
  const text = result.stdout;
  if (
    text.includes("\0") ||
    Buffer.byteLength(text, "utf8") > GIT_DIFF_MAX_BYTES
  ) {
    return { path: relative, text: null, binary: true };
  }
  return { path: relative, text, binary: false };
}
