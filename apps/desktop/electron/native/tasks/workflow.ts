import { BOARD_STATUSES, ISSUE_STATUSES } from "./constants";
import type { TaskWorkflowColumn, WorkflowCategory } from "./types";

export const DEFAULT_PROJECT_ICON = "folder";

export const DEFAULT_WORKFLOW: TaskWorkflowColumn[] = [
  { id: "todo", label: "Todo", category: "unstarted" },
  { id: "in_progress", label: "In Progress", category: "started" },
  { id: "in_review", label: "In Review", category: "started" },
  { id: "done", label: "Done", category: "completed" },
  { id: "canceled", label: "Canceled", category: "canceled" },
];

const CATEGORIES = new Set<WorkflowCategory>([
  "unstarted",
  "started",
  "completed",
  "canceled",
]);

export function projectIcon(value: unknown): string {
  if (value === "target" || value === "shapes") return DEFAULT_PROJECT_ICON;
  if (typeof value !== "string") return DEFAULT_PROJECT_ICON;
  if (/^lucide:[a-z][a-z0-9-]*$/.test(value)) return value;
  if (/^[a-z][a-z0-9-]*$/.test(value)) return value;
  const emoji = value.startsWith("emoji:") ? value.slice(6) : "";
  return emoji.length <= 32 && /\p{Emoji}/u.test(emoji)
    ? value
    : DEFAULT_PROJECT_ICON;
}

export function parseWorkflow(
  projectId: string,
  value: unknown,
): TaskWorkflowColumn[] {
  if (!Array.isArray(value))
    return DEFAULT_WORKFLOW.map((item) => ({ ...item }));
  const parsed: TaskWorkflowColumn[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return DEFAULT_WORKFLOW.map((column) => ({ ...column }));
    }
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const category = row.category as WorkflowCategory;
    const base = (BOARD_STATUSES as readonly string[]).includes(id);
    if (
      !id ||
      !label ||
      ids.has(id) ||
      !CATEGORIES.has(category) ||
      (!base && !id.startsWith(`${projectId}--`))
    ) {
      return DEFAULT_WORKFLOW.map((column) => ({ ...column }));
    }
    ids.add(id);
    parsed.push({
      id,
      label,
      category,
      ...(row.hidden === true ? { hidden: true } : {}),
    });
  }
  const required = BOARD_STATUSES.filter((id) => id !== "in_review");
  if (!required.every((id) => ids.has(id))) {
    return DEFAULT_WORKFLOW.map((item) => ({ ...item }));
  }
  if (!ids.has("in_review")) {
    const progress = parsed.findIndex((item) => item.id === "in_progress");
    parsed.splice(progress + 1, 0, { ...DEFAULT_WORKFLOW[2] });
  }
  return parsed;
}

export function isCustomStatus(status: string): boolean {
  return !(ISSUE_STATUSES as readonly string[]).includes(status);
}
