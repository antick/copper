import {
  DEFAULT_ISSUE_PRIORITY,
  DEFAULT_ISSUE_STATUS,
  DEFAULT_PROJECT_STATUS,
  FRONTMATTER_KEYS,
  ISSUE_PRIORITIES,
  type IssuePriority,
  type IssueStatus,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "./constants";
import type { TaskComment } from "./types";

export function asIssueStatus(value: unknown): IssueStatus {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_ISSUE_STATUS;
}

export function asIssuePriority(value: unknown): IssuePriority {
  return ISSUE_PRIORITIES.includes(value as IssuePriority)
    ? (value as IssuePriority)
    : DEFAULT_ISSUE_PRIORITY;
}

export function asProjectStatus(value: unknown): ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : DEFAULT_PROJECT_STATUS;
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function asTaskComments(value: unknown): TaskComment[] {
  if (!Array.isArray(value)) return [];
  const comments: TaskComment[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const comment = item as Record<string, unknown>;
    const id = typeof comment.id === "string" ? comment.id.trim() : "";
    const body = typeof comment.body === "string" ? comment.body : "";
    const created =
      typeof comment.created === "string" ? comment.created.trim() : "";
    const updated =
      typeof comment.updated === "string" ? comment.updated.trim() : "";
    if (!id || ids.has(id) || !body.trim() || !created || !updated) continue;
    ids.add(id);
    comments.push({ id, body, created, updated });
  }
  return comments;
}

export function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function headingTitle(body: string, fallback: string): string {
  const heading = body.split("\n").find((line) => /^#\s+/.test(line));
  return heading?.replace(/^#\s+/, "").trim() || fallback;
}

export function replaceHeading(body: string, title: string): string {
  if (/^#\s+/m.test(body)) {
    return body.replace(/^#\s+.*$/m, `# ${title}`);
  }
  const prefix = `# ${title}\n`;
  return body.length > 0 ? `${prefix}\n${body}` : `${prefix}`;
}

export function fileStemTitle(filePath: string): string {
  const name = filePath.split("/").at(-1) ?? filePath;
  return name.replace(/\.(md|markdown)$/i, "");
}

export function readString(
  values: Record<string, unknown>,
  key: string,
): unknown {
  return values[key];
}

export { FRONTMATTER_KEYS };
