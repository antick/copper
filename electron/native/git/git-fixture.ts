import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GIT_BIN, GIT_HOOKS_PATH } from "./constants";

export function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function gitSetup(
  cwd: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): string {
  const result = spawnSync(
    GIT_BIN,
    [
      "-c",
      `core.hooksPath=${GIT_HOOKS_PATH}`,
      "-c",
      "core.fsmonitor=false",
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...env,
        GIT_TERMINAL_PROMPT: "0",
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout ?? "";
}

export function initRepo(
  dir: string,
  options: { identity?: boolean } = {},
): void {
  fs.mkdirSync(dir, { recursive: true });
  gitSetup(dir, ["init", "-b", "main"]);
  if (options.identity !== false) {
    gitSetup(dir, ["config", "user.name", "Copper Test"]);
    gitSetup(dir, ["config", "user.email", "copper-test@example.com"]);
  }
  gitSetup(dir, ["config", "commit.gpgsign", "false"]);
}

export function writeFile(
  root: string,
  relative: string,
  contents: string | Buffer,
): void {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
}

export function readFile(root: string, relative: string): string {
  return fs.readFileSync(path.join(root, ...relative.split("/")), "utf8");
}

export function fileExists(root: string, relative: string): boolean {
  return fs.existsSync(path.join(root, ...relative.split("/")));
}

const PNG_A = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const PNG_B = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

export const FIXTURE_PNG = { a: PNG_A, b: PNG_B };

export function makeLinkedClones(): {
  bare: string;
  local: string;
  remote: string;
} {
  const root = makeTempDir("copper-git-net-");
  const bare = path.join(root, "bare.git");
  const local = path.join(root, "local");
  const remote = path.join(root, "remote");
  fs.mkdirSync(bare, { recursive: true });
  gitSetup(bare, ["init", "--bare", "-b", "main"]);
  initRepo(local);
  writeFile(local, "README.md", "# Vault\n");
  gitSetup(local, ["add", "README.md"]);
  gitSetup(local, ["commit", "-m", "initial"]);
  gitSetup(local, ["remote", "add", "origin", bare]);
  gitSetup(local, ["push", "-u", "origin", "main"]);
  gitSetup(root, ["clone", bare, remote]);
  gitSetup(remote, ["config", "user.name", "Copper Other"]);
  gitSetup(remote, ["config", "user.email", "copper-other@example.com"]);
  gitSetup(remote, ["config", "commit.gpgsign", "false"]);
  return { bare, local, remote };
}
