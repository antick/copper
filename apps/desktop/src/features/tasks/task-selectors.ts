import { DESTINATION_LABELS } from "@/features/tasks/constants";
import { issueCategory, workflowColumn } from "@/features/tasks/workflow";
import type {
  TasksDestination,
  TasksProjectView,
  TasksView,
} from "@/lib/copper/settings";
import type {
  CreateIssueInput,
  TaskIssue,
  TaskProject,
  TaskProjectCounts,
} from "@/lib/copper/tasks";

export const TASK_VISIBLE_PROPERTIES = [
  "status",
  "priority",
  "project",
  "labels",
  "due",
] as const;

export type TaskVisibleProperty = (typeof TASK_VISIBLE_PROPERTIES)[number];

export function issuesForDestination(
  issues: TaskIssue[],
  destination: TasksDestination,
  projects: TaskProject[] = [],
): TaskIssue[] {
  if (destination === "active") {
    return issues.filter((issue) => {
      const category = issueCategory(issue, projects);
      return category === "unstarted" || category === "started";
    });
  }
  if (destination === "backlog") {
    return issues.filter((issue) => issue.status === "backlog");
  }
  if (destination === "completed") {
    return issues.filter(
      (issue) => issue.status === "done" || issue.status === "canceled",
    );
  }
  return issues;
}

export function effectiveTaskView(
  destination: TasksDestination,
  projectView: TasksProjectView,
  view: TasksView,
): TasksView {
  if (destination === "backlog" || destination === "completed") return "list";
  if (destination === "project")
    return projectView === "board" ? "board" : "list";
  return view;
}

export function taskSurfaceTitle(
  destination: TasksDestination,
  projectTitle?: string,
) {
  return destination === "project"
    ? (projectTitle ?? "Project")
    : DESTINATION_LABELS[destination];
}

export function taskDescription(body: string | undefined) {
  return (body ?? "").replace(/^\s*#\s+[^\r\n]+\r?\n(?:\r?\n)?/, "");
}

export function duplicateIssueInput(issue: TaskIssue): CreateIssueInput {
  return {
    title: issue.title,
    project: issue.project,
    status: issue.status,
    priority: issue.priority,
    labels: [...issue.labels],
    due: issue.due,
    body: taskDescription(issue.body),
    afterId: issue.id,
  };
}

export function taskBody(title: string, description: string) {
  const trimmed = description.replace(/^\s+/, "");
  return `# ${title}\n${trimmed ? `\n${trimmed}` : ""}`;
}

export interface ProjectSummary {
  total: number;
  done: number;
  open: number;
  progress: number;
}

export function summarizeProject(project: TaskProject): ProjectSummary {
  const counts: TaskProjectCounts = project.counts;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  let done = 0;
  let open = counts.backlog ?? 0;
  for (const [status, count] of Object.entries(counts)) {
    if (status === "backlog") continue;
    const category = workflowColumn(status, project)?.category;
    if (category === "completed") done += count;
    if (category === "unstarted" || category === "started") open += count;
  }
  return {
    total,
    done,
    open,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

const TASK_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const TASK_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatTaskDate(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? "" : TASK_DATE_FORMATTER.format(date);
}

export function formatTaskTimestamp(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : TASK_TIMESTAMP_FORMATTER.format(date);
}
