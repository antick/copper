import path from "node:path";
import {
  formatIssueId,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import { SLUG_MAX_LENGTH } from "./constants";

export type TaskKind = "issue" | "project";

const ISSUE_ID_PATTERN = /^(#\d+|[A-Z][A-Z0-9]{0,7}-\d+)(?=$|[-_.])/i;

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

export function fallbackTaskId(relative: string, kind: TaskKind): string {
  const stem = path.posix.parse(relative).name;
  if (kind === "issue") return parseIssueId(stem) ?? stem;
  return slugifyTitle(stem);
}
