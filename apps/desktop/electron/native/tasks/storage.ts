import fs from "node:fs";
import path from "node:path";
import {
  LEGACY_TASK_ARCHIVE_DIR,
  LEGACY_TASK_DIRECTORIES,
  LEGACY_TASKS_DIR,
} from "../../../shared/task-paths";
import { atomicWrite } from "../atomic-write";
import { MAX_SUPPORTED_FILE_SIZE, SKIP_DIR_NAMES } from "../constants";
import { CopperError } from "../errors";
import { resolveInVault } from "../path";
import { rewriteTaskLinks, type TaskPathMove } from "./storage-links";
import { planTaskMoves } from "./storage-plan";

export function migrateTaskStorage(root: string): TaskPathMove[] {
  const { moves, retainedTargets } = planTaskMoves(root);
  if (!moves.length) return [];
  const originals = new Map<string, Buffer>();
  const rewrites = new Map<string, string>();
  const moved = new Map(moves.map((move) => [move.from, move.to]));
  function inspect(dir: string) {
    for (const entry of fs.readdirSync(resolveInVault(root, dir), {
      withFileTypes: true,
    })) {
      if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name))
        continue;
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        inspect(relative);
        continue;
      }
      if (!entry.isFile() || !/\.(md|markdown)$/i.test(entry.name)) continue;
      const absolute = resolveInVault(root, relative);
      if (fs.statSync(absolute).size > MAX_SUPPORTED_FILE_SIZE) continue;
      const bytes = fs.readFileSync(absolute);
      const source = bytes.toString("utf8");
      if (!Buffer.from(source).equals(bytes)) continue;
      const to = moved.get(relative) ?? relative;
      const next = rewriteTaskLinks(source, relative, to, moves);
      if (source !== next || moved.has(relative))
        originals.set(relative, bytes);
      if (source !== next) rewrites.set(to, next);
    }
  }
  inspect("");
  for (const move of moves)
    if (retainedTargets.has(move.to)) {
      const bytes = fs.readFileSync(resolveInVault(root, move.to));
      const expected =
        rewrites.get(move.to) ??
        (originals.get(move.from) as Buffer).toString("utf8");
      if (
        !bytes.equals(originals.get(move.from) as Buffer) &&
        bytes.toString("utf8") !== expected
      )
        throw CopperError.invalid(
          `Conflicting copies of ${move.from} were found. Both files have been kept.`,
        );
      originals.set(move.to, bytes);
      if (bytes.toString("utf8") === expected) rewrites.delete(move.to);
    }
  const copied: string[] = [];
  const written: string[] = [];
  const removed: string[] = [];
  try {
    for (const move of moves) {
      if (
        !fs
          .readFileSync(resolveInVault(root, move.from))
          .equals(originals.get(move.from) as Buffer)
      )
        throw new Error(
          `${move.from} changed during migration. Please try again.`,
        );
      if (retainedTargets.has(move.to)) continue;
      const destination = resolveInVault(root, move.to);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(
        resolveInVault(root, move.from),
        destination,
        fs.constants.COPYFILE_EXCL,
      );
      copied.push(move.to);
    }
    for (const [relative, source] of rewrites) {
      if (
        !copied.includes(relative) &&
        !fs
          .readFileSync(resolveInVault(root, relative))
          .equals(originals.get(relative) as Buffer)
      )
        throw new Error(
          `${relative} changed during migration. Please try again.`,
        );
      atomicWrite(resolveInVault(root, relative), source);
      written.push(relative);
    }
    for (const move of moves) {
      if (
        !fs
          .readFileSync(resolveInVault(root, move.from))
          .equals(originals.get(move.from) as Buffer)
      )
        throw new Error(
          `${move.from} changed during migration. Please try again.`,
        );
      fs.unlinkSync(resolveInVault(root, move.from));
      removed.push(move.from);
    }
  } catch (error) {
    let restored = true;
    for (const relative of removed)
      try {
        fs.writeFileSync(
          resolveInVault(root, relative),
          originals.get(relative) as Buffer,
          { flag: "wx" },
        );
      } catch {
        restored = false;
      }
    for (const relative of written)
      if (!copied.includes(relative))
        try {
          if (
            fs.readFileSync(resolveInVault(root, relative), "utf8") ===
            rewrites.get(relative)
          )
            atomicWrite(
              resolveInVault(root, relative),
              (originals.get(relative) as Buffer).toString("utf8"),
            );
        } catch {
          restored = false;
        }
    if (restored)
      for (const relative of copied) {
        const original = originals.get(
          moves.find((move) => move.to === relative)?.from ?? "",
        );
        const expected = rewrites.get(relative) ?? original?.toString("utf8");
        if (
          fs.readFileSync(resolveInVault(root, relative), "utf8") === expected
        )
          fs.unlinkSync(resolveInVault(root, relative));
      }
    throw CopperError.io(
      `Could not move task storage: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  // Remove only empty generated folders; user notes keep their current home.
  for (const directory of [
    ...LEGACY_TASK_DIRECTORIES.map((item) => item.from),
    LEGACY_TASKS_DIR,
    LEGACY_TASK_ARCHIVE_DIR,
  ]) {
    const absolute = resolveInVault(root, directory);
    if (
      fs.existsSync(absolute) &&
      fs.lstatSync(absolute).isDirectory() &&
      fs.readdirSync(absolute).length === 0
    )
      fs.rmdirSync(absolute);
  }
  return moves;
}
