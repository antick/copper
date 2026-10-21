import fs from "node:fs";
import path from "node:path";
import {
  ARCHIVE_DIR,
  ARCHIVED_ISSUES_DIR,
  ARCHIVED_PROJECTS_DIR,
  ISSUES_DIR,
  isArchivedPath,
  isTaskSourcePath,
  LEGACY_TASK_DIRECTORIES,
  PROJECTS_DIR,
} from "../../../shared/task-paths";
import {
  formatIssueId,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import {
  isMarkdownPath,
  shouldIndexEntry,
  shouldIndexFile,
} from "../index/eligibility";
import { parseFrontmatter } from "../markdown/frontmatter";
import { toPosix } from "../path";
import { FRONTMATTER_KEYS, SLUG_MAX_LENGTH } from "./constants";

export type TaskKind = "issue" | "project";

export interface DiscoveredTaskIdentity {
  relative: string;
  kind: TaskKind;
  id: string;
  archived: boolean;
}

const TASK_SOURCE_DIRECTORIES: Array<[TaskKind, string]> = [
  ["issue", ISSUES_DIR],
  ["issue", ARCHIVED_ISSUES_DIR],
  ["project", PROJECTS_DIR],
  ["project", ARCHIVED_PROJECTS_DIR],
];
const ISSUE_ID_PATTERN = /^(#\d+|[A-Z][A-Z0-9]{0,7}-\d+)(?=$|[-_.])/i;

function isMarkdownFileInDirectory(relative: string, directory: string) {
  if (!relative.startsWith(`${directory}/`)) return false;
  const name = relative.slice(directory.length + 1);
  return /^[^/.][^/]*\.(md|markdown)$/i.test(name);
}

function managedTaskKind(relative: string): TaskKind | undefined {
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

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
  return slug.length > 0 ? slug : "untitled";
}

export function parseIssueId(text: string): string | undefined {
  const match = text.trim().match(ISSUE_ID_PATTERN);
  const parsed = parseIssueIdentifier(match?.[1]);
  return parsed && parsed.sequence > 0
    ? formatIssueId(parsed.prefix, parsed.sequence)
    : undefined;
}

function fallbackTaskId(relative: string, kind: TaskKind): string {
  const stem = path.posix.parse(relative).name;
  if (kind === "issue") return parseIssueId(stem) ?? stem;
  return slugifyTitle(stem);
}

export function taskIdentityFromSource(
  relative: string,
  source: string,
): DiscoveredTaskIdentity | undefined {
  if (!isMarkdownPath(relative) || !shouldIndexFile(relative)) return undefined;

  let values: Record<string, unknown> = {};
  try {
    values = parseFrontmatter(source).values;
  } catch {
    // A recognizable managed filename still reserves its fallback identity.
  }
  const pathKind = managedTaskKind(relative);
  const type = values[FRONTMATTER_KEYS.type];
  const kind = type === "issue" || type === "project" ? type : pathKind;
  if (!kind) return undefined;

  const storedId = values[FRONTMATTER_KEYS.id];
  const id =
    typeof storedId === "string" && storedId.length > 0
      ? storedId
      : pathKind
        ? fallbackTaskId(relative, kind)
        : path.posix.parse(relative).name;
  if (!id) return undefined;
  return { relative, kind, id, archived: isArchivedPath(relative) };
}

export function discoverTaskIdentities(
  vaultRoot: string,
): DiscoveredTaskIdentity[] {
  const tasks: DiscoveredTaskIdentity[] = [];

  function visit(directory: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = toPosix(path.relative(vaultRoot, absolute));
      const isDirectory = entry.isDirectory();
      if (!shouldIndexEntry(relative, entry.name, isDirectory)) continue;
      if (isDirectory) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile() || !isMarkdownPath(absolute)) continue;

      try {
        const identity = taskIdentityFromSource(
          relative,
          fs.readFileSync(absolute, "utf8"),
        );
        if (identity) tasks.push(identity);
      } catch {
        // Keep scanning other files if one disappears or cannot be read.
      }
    }
  }

  visit(vaultRoot);
  return tasks;
}
