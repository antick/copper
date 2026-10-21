import fs from "node:fs";
import path from "node:path";
import { LEGACY_TASK_DIRECTORIES } from "../../../shared/task-paths";
import { MAX_SUPPORTED_FILE_SIZE } from "../constants";
import { CopperError } from "../errors";
import { parseFrontmatter } from "../markdown/frontmatter";
import { resolveInVault } from "../path";
import type { TaskPathMove } from "./storage-links";

function taskIdentity(absolute: string, kind: string): string | undefined {
  if (fs.statSync(absolute).size > MAX_SUPPORTED_FILE_SIZE) return;
  const bytes = fs.readFileSync(absolute);
  const source = bytes.toString("utf8");
  if (!Buffer.from(source).equals(bytes)) return;
  let values: Record<string, unknown>;
  try {
    values = parseFrontmatter(source).values;
  } catch {
    return;
  }
  if (values.type !== kind) return;
  return `${kind}:${typeof values.id === "string" && values.id ? values.id : path.parse(absolute).name}`;
}

function files(root: string, relative: string) {
  const absolute = resolveInVault(root, relative);
  if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isDirectory())
    return [];
  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        /\.(md|markdown)$/i.test(entry.name),
    );
}

export function planTaskMoves(root: string) {
  const moves: TaskPathMove[] = [];
  const retainedTargets = new Set<string>();
  const claimed = new Set<string>();
  const identities = new Map<string, string>();
  for (const directory of LEGACY_TASK_DIRECTORIES)
    for (const entry of files(root, directory.to)) {
      const relative = `${directory.to}/${entry.name}`;
      const identity = taskIdentity(
        resolveInVault(root, relative),
        directory.kind,
      );
      if (identity) identities.set(identity, relative);
    }
  const plannedIdentities = new Set<string>();
  for (const directory of LEGACY_TASK_DIRECTORIES)
    for (const entry of files(root, directory.from)) {
      const from = `${directory.from}/${entry.name}`;
      const identity = taskIdentity(resolveInVault(root, from), directory.kind);
      if (!identity) continue;
      if (plannedIdentities.has(identity))
        throw CopperError.invalid(
          `Multiple legacy task files use ${identity}. Both files have been kept.`,
        );
      plannedIdentities.add(identity);
      const existing = identities.get(identity);
      let to = `${directory.to}/${entry.name}`;
      if (existing) {
        if (path.posix.dirname(existing) !== directory.to)
          throw CopperError.invalid(
            `Conflicting task files use ${identity}. Both files have been kept.`,
          );
        to = existing;
        retainedTargets.add(to);
      } else {
        const parsed = path.posix.parse(entry.name);
        let suffix = 2;
        while (claimed.has(to) || fs.existsSync(resolveInVault(root, to)))
          to = `${directory.to}/${parsed.name}-${suffix++}${parsed.ext}`;
      }
      claimed.add(to);
      moves.push({ from, to });
    }
  return { moves, retainedTargets };
}
