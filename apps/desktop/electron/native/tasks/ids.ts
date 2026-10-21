import fs from "node:fs";
import path from "node:path";
import {
  ARCHIVE_DIR,
  ARCHIVED_ISSUES_DIR,
  isTaskSourcePath,
  LEGACY_TASK_DIRECTORIES,
} from "../../../shared/task-paths";
import {
  DEFAULT_ISSUE_ID_PREFIX,
  formatIssueId,
  normalizeIssueIdPrefix,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import { parseFrontmatter } from "../markdown/frontmatter";
import { FRONTMATTER_KEYS, ISSUES_DIR, SLUG_MAX_LENGTH } from "./constants";

const ISSUE_ID_PATTERN = /^(#\d+|[A-Z][A-Z0-9]{0,7}-\d+)(?=$|[-_.])/i;
const ISSUE_SCAN_DIRECTORIES = [
  ISSUES_DIR,
  ARCHIVED_ISSUES_DIR,
  ...LEGACY_TASK_DIRECTORIES.filter(
    (directory) => directory.kind === "issue",
  ).map((directory) => directory.from),
  `${ARCHIVE_DIR}/${ISSUES_DIR}`,
  `${ARCHIVE_DIR}/${ARCHIVED_ISSUES_DIR}`,
];

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
  return parsed ? formatIssueId(parsed.prefix, parsed.sequence) : undefined;
}

export function nextIssueId(prefix: string, ids: Iterable<string>): string {
  const normalizedPrefix = normalizeIssueIdPrefix(prefix);
  let max = 0;
  for (const id of ids) {
    const parsed = parseIssueIdentifier(id);
    if (parsed?.prefix === normalizedPrefix && parsed.sequence > max)
      max = parsed.sequence;
  }
  return formatIssueId(normalizedPrefix, max + 1);
}

/** Scan Vault files only. A stale SQLite index must not be consulted. */
export function scanIssueIds(vaultRoot: string): string[] {
  const ids = new Set<string>();
  for (const directory of new Set(ISSUE_SCAN_DIRECTORIES)) {
    const dir = path.join(vaultRoot, directory);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!/\.(md|markdown)$/i.test(name)) {
        continue;
      }
      const relative = `${directory}/${name}`;
      const isLegacyIssuePath = LEGACY_TASK_DIRECTORIES.some(
        (legacy) =>
          legacy.kind === "issue" &&
          relative.startsWith(`${legacy.from}/`) &&
          /^[^/.][^/]*\.(md|markdown)$/i.test(name),
      );
      if (!isTaskSourcePath(relative) && !isLegacyIssuePath) continue;
      const fromName = parseIssueId(name);
      if (fromName) {
        ids.add(fromName);
      }
      try {
        const source = fs.readFileSync(path.join(dir, name), "utf8");
        const parsed = parseFrontmatter(source);
        const raw = parsed.values[FRONTMATTER_KEYS.id];
        if (typeof raw === "string") {
          const fromFrontmatter = parseIssueId(raw) ?? raw.trim();
          if (fromFrontmatter.length > 0) {
            ids.add(fromFrontmatter);
          }
        }
      } catch {
        // Malformed files still occupy their filename id.
      }
    }
  }
  return [...ids];
}

export function allocateIssueId(
  vaultRoot: string,
  prefix = DEFAULT_ISSUE_ID_PREFIX,
): string {
  return nextIssueId(prefix, scanIssueIds(vaultRoot));
}
