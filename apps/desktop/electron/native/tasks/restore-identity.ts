import fs from "node:fs";
import path from "node:path";
import {
  ARCHIVE_DIR,
  ARCHIVED_ISSUES_DIR,
  ARCHIVED_PROJECTS_DIR,
  ISSUES_DIR,
  isArchivedTaskPath,
  isTaskSourcePath,
  LEGACY_TASK_DIRECTORIES,
  PROJECTS_DIR,
} from "../../../shared/task-paths";
import { CopperError } from "../errors";
import { parseFrontmatter } from "../markdown/frontmatter";
import { resolveInVault } from "../path";
import { FRONTMATTER_KEYS } from "./constants";
import { parseIssueId, slugifyTitle } from "./ids";

type TaskKind = "issue" | "project";

interface TaskIdentity {
  kind: TaskKind;
  id: string;
}

const TASK_SOURCE_DIRECTORIES: Array<[TaskKind, string]> = [
  ["issue", ISSUES_DIR],
  ["issue", ARCHIVED_ISSUES_DIR],
  ["project", PROJECTS_DIR],
  ["project", ARCHIVED_PROJECTS_DIR],
];

function isMarkdownFileInDirectory(relative: string, directory: string) {
  if (!relative.startsWith(`${directory}/`)) return false;
  const name = relative.slice(directory.length + 1);
  return /^[^/.][^/]*\.(md|markdown)$/i.test(name);
}

function taskKindForPath(relative: string): TaskKind | undefined {
  const candidates = relative.startsWith(`${ARCHIVE_DIR}/`)
    ? [relative, relative.slice(ARCHIVE_DIR.length + 1)]
    : [relative];

  const legacy = LEGACY_TASK_DIRECTORIES.find((directory) =>
    candidates.some((candidate) =>
      isMarkdownFileInDirectory(candidate, directory.from),
    ),
  );
  if (legacy) return legacy.kind;
  if (!isTaskSourcePath(relative)) return undefined;

  for (const [kind, directory] of TASK_SOURCE_DIRECTORIES) {
    if (
      candidates.some((candidate) =>
        isMarkdownFileInDirectory(candidate, directory),
      )
    ) {
      return kind;
    }
  }
  return undefined;
}

function fallbackTaskId(relative: string, kind: TaskKind): string {
  const stem = path.posix.parse(relative).name;
  if (kind === "issue") return parseIssueId(stem) ?? stem;
  return slugifyTitle(stem);
}

function taskIdentity(
  relative: string,
  source: string,
): TaskIdentity | undefined {
  const pathKind = taskKindForPath(relative);
  if (!pathKind) return undefined;

  let values: Record<string, unknown> = {};
  try {
    values = parseFrontmatter(source).values;
  } catch {
    // A recognizable managed filename still reserves its fallback identity.
  }
  const type = values[FRONTMATTER_KEYS.type];
  const kind = type === "issue" || type === "project" ? type : pathKind;
  const storedId = values[FRONTMATTER_KEYS.id];
  const id =
    typeof storedId === "string" && storedId.length > 0
      ? storedId
      : fallbackTaskId(relative, kind);
  return id ? { kind, id } : undefined;
}

function activeTaskDirectories(kind: TaskKind): string[] {
  const current = kind === "issue" ? ISSUES_DIR : PROJECTS_DIR;
  const legacy = LEGACY_TASK_DIRECTORIES.filter(
    (directory) =>
      directory.kind === kind && !directory.from.startsWith(`${ARCHIVE_DIR}/`),
  ).map((directory) => directory.from);
  return [current, ...legacy];
}

function activeManagedTaskPath(relative: string): boolean {
  return (
    !relative.startsWith(`${ARCHIVE_DIR}/`) &&
    !isArchivedTaskPath(relative) &&
    taskKindForPath(relative) !== undefined
  );
}

function hasActiveIdentity(
  root: string,
  identity: TaskIdentity,
  destination: string,
): boolean {
  for (const directory of activeTaskDirectories(identity.kind)) {
    const absoluteDirectory = path.join(root, directory);
    let names: string[];
    try {
      names = fs.readdirSync(absoluteDirectory);
    } catch {
      continue;
    }

    for (const name of names) {
      if (!/\.(md|markdown)$/i.test(name)) continue;
      const relative = `${directory}/${name}`;
      if (relative === destination) continue;
      try {
        const absolute = resolveInVault(root, relative);
        if (!fs.lstatSync(absolute).isFile()) continue;
        const current = taskIdentity(
          relative,
          fs.readFileSync(absolute, "utf8"),
        );
        if (current?.kind === identity.kind && current.id === identity.id) {
          return true;
        }
      } catch {
        // Ignore unreadable or unsafe unrelated files while scanning the Vault.
      }
    }
  }
  return false;
}

export function assertNoActiveTaskIdentityCollision(
  root: string,
  sourcePath: string,
  sourceAbsolute: string,
  destinationPath: string,
): void {
  if (!activeManagedTaskPath(destinationPath)) return;
  if (!taskKindForPath(sourcePath)) return;
  const source = fs.readFileSync(sourceAbsolute, "utf8");
  const identity = taskIdentity(sourcePath, source);
  if (!identity || !hasActiveIdentity(root, identity, destinationPath)) return;

  throw CopperError.invalid(
    `Cannot restore ${identity.kind} ${identity.id} because it is already active`,
  );
}
