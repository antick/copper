import { spawn } from "node:child_process";
import {
  GIT_BIN,
  GIT_HOOKS_PATH,
  GIT_SPAWN_TIMEOUT_MS,
  GIT_TERMINAL_PROMPT,
} from "./constants";
import type { GitRunner, GitRunResult } from "./types";

export class GitCommandError extends Error {
  readonly reason: "no_git_bin" | "timeout" | "io" | "auth";
  readonly stderr: string;
  readonly code: number | null;
  readonly argv: string[];

  constructor(
    reason: GitCommandError["reason"],
    message: string,
    stderr = "",
    code: number | null = null,
    argv: string[] = [],
  ) {
    super(message);
    this.name = "GitCommandError";
    this.reason = reason;
    this.stderr = stderr;
    this.code = code;
    this.argv = argv;
  }
}

export function gitArgv(args: string[]): string[] {
  return [
    "-c",
    `core.hooksPath=${GIT_HOOKS_PATH}`,
    "-c",
    "core.fsmonitor=false",
    ...args,
  ];
}

export function classifyGitStderr(stderr: string): "auth" | "io" {
  if (
    /authentication|auth fail|permission denied|could not read username|terminal prompts disabled|403|401|invalid user/i.test(
      stderr,
    )
  ) {
    return "auth";
  }
  return "io";
}

export const runGit: GitRunner = async (root, args, options = {}) => {
  const argv = gitArgv(args);
  const result = await spawnGit(root, argv, options.binary === true);
  if (!options.allowFailure && result.code !== 0) {
    throw new GitCommandError(
      result.code === null ? "timeout" : classifyGitStderr(result.stderr),
      result.code === null
        ? "Git timed out"
        : `Git exited with code ${result.code}`,
      result.stderr,
      result.code,
      argv,
    );
  }
  return result;
};

function spawnGit(
  root: string,
  argv: string[],
  binary: boolean,
): Promise<GitRunResult & { stdoutBuffer?: Buffer }> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(GIT_BIN, argv, {
        cwd: root,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT,
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      reject(toMissingBin(error, argv));
      return;
    }

    child.on("error", (error) => {
      reject(toMissingBin(error, argv));
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, GIT_SPAWN_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      const stdoutBuffer = Buffer.concat(stdoutChunks);
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code === null) {
        reject(
          new GitCommandError("timeout", "Git timed out", stderr, null, argv),
        );
        return;
      }
      resolve({
        stdout: binary ? "" : stdoutBuffer.toString("utf8"),
        stdoutBuffer,
        stderr,
        code,
      });
    });
  });
}

function toMissingBin(error: unknown, argv: string[]): GitCommandError {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "ENOENT") {
    return new GitCommandError(
      "no_git_bin",
      "Git is not installed",
      "",
      null,
      argv,
    );
  }
  return new GitCommandError(
    "io",
    err.message || String(error),
    "",
    null,
    argv,
  );
}

export async function gitText(
  root: string,
  args: string[],
  runner: GitRunner = runGit,
): Promise<string> {
  const result = await runner(root, args);
  return result.stdout.trim();
}
