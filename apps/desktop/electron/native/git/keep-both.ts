import fs from "node:fs";
import path from "node:path";
import { toPosix } from "../path";
import { runGit } from "./run";
import {
  absoluteInVault,
  dirnameAbsolute,
  nextSiblingRelative,
  sidecarSuffix,
} from "./sibling";
import type { GitHostKind, GitRunner } from "./types";

interface UnmergedEntry {
  path: string;
  ours: Buffer | null;
  theirs: Buffer | null;
}

export async function applyKeepBoth(
  root: string,
  host: GitHostKind,
  runner: GitRunner = runGit,
): Promise<string[]> {
  const entries = await unmergedEntries(root, runner);
  const suffix = sidecarSuffix(host);
  const siblings: string[] = [];
  for (const entry of entries) {
    const sibling = nextSiblingRelative(root, entry.path, suffix);
    if (entry.ours) {
      writeVaultFile(root, entry.path, entry.ours);
      await runner(root, ["add", "--", entry.path]);
    } else {
      removeIfPresent(root, entry.path);
      await runner(root, ["rm", "-f", "--", entry.path], {
        allowFailure: true,
      });
    }
    if (entry.theirs) {
      writeVaultFile(root, sibling, entry.theirs);
      await runner(root, ["add", "--", sibling]);
      siblings.push(sibling);
    }
  }
  return siblings;
}

async function unmergedEntries(
  root: string,
  runner: GitRunner,
): Promise<UnmergedEntry[]> {
  const listed = await runner(root, ["ls-files", "-u", "-z"], {
    allowFailure: true,
  });
  if (listed.code !== 0 || !listed.stdout) {
    return [];
  }
  const paths = new Set<string>();
  for (const record of listed.stdout.split("\0")) {
    if (!record.trim()) continue;
    const tab = record.indexOf("\t");
    if (tab === -1) continue;
    paths.add(record.slice(tab + 1));
  }
  const entries: UnmergedEntry[] = [];
  for (const filePath of paths) {
    entries.push({
      path: toPosix(filePath),
      ours: await showStage(root, filePath, 2, runner),
      theirs: await showStage(root, filePath, 3, runner),
    });
  }
  return entries;
}

async function showStage(
  root: string,
  filePath: string,
  stage: 2 | 3,
  runner: GitRunner,
): Promise<Buffer | null> {
  const result = await runner(root, ["show", `:${stage}:${filePath}`], {
    allowFailure: true,
    binary: true,
  });
  if (result.code !== 0) {
    return null;
  }
  return result.stdoutBuffer ?? Buffer.from(result.stdout);
}

function writeVaultFile(
  root: string,
  relativeFile: string,
  bytes: Buffer,
): void {
  const absolute = absoluteInVault(root, relativeFile);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.mkdirSync(dirnameAbsolute(root, relativeFile), { recursive: true });
  fs.writeFileSync(absolute, bytes);
}

function removeIfPresent(root: string, relativeFile: string): void {
  const absolute = absoluteInVault(root, relativeFile);
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}
