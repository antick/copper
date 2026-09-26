import { BOARD_STATUSES, STATUS_LABELS } from "@/features/tasks/constants";
import type {
  BaseIssueStatus,
  TaskIssue,
  TaskProject,
  TaskWorkflowColumn,
  WorkflowCategory,
} from "@/lib/copper/tasks";

export const DEFAULT_WORKFLOW: TaskWorkflowColumn[] = [
  { id: "todo", label: "Todo", category: "unstarted" },
  { id: "in_progress", label: "In Progress", category: "started" },
  { id: "in_review", label: "In Review", category: "started" },
  { id: "done", label: "Done", category: "completed" },
  { id: "canceled", label: "Canceled", category: "canceled" },
];

export function activeProjects(projects: TaskProject[]) {
  return projects.filter((project) => !project.archived);
}

export function projectWorkflow(project: TaskProject | undefined) {
  const workflow = project?.workflow?.length
    ? project.workflow
    : DEFAULT_WORKFLOW;
  if (workflow.some(({ id }) => id === "in_review")) return workflow;
  const upgraded = [...workflow];
  const progress = upgraded.findIndex(({ id }) => id === "in_progress");
  upgraded.splice(progress + 1, 0, { ...DEFAULT_WORKFLOW[2] });
  return upgraded;
}

export function visibleProjectWorkflow(project: TaskProject | undefined) {
  return projectWorkflow(project).filter((column) => !column.hidden);
}

export function isHiddenProjectStatus(
  status: string,
  project: TaskProject | undefined,
) {
  return Boolean(
    projectWorkflow(project).find((column) => column.id === status)?.hidden,
  );
}

export function workflowColumn(
  status: string,
  project: TaskProject | undefined,
): TaskWorkflowColumn | undefined {
  if (status === "backlog") {
    return { id: "backlog", label: "Backlog", category: "unstarted" };
  }
  return (
    projectWorkflow(project).find((column) => column.id === status) ??
    DEFAULT_WORKFLOW.find((column) => column.id === status)
  );
}

export function issueCategory(
  issue: Pick<TaskIssue, "project" | "status">,
  projects: TaskProject[],
): WorkflowCategory | "backlog" | "unknown" {
  if (issue.status === "backlog") return "backlog";
  return (
    workflowColumn(
      issue.status,
      projects.find((project) => project.id === issue.project),
    )?.category ?? "unknown"
  );
}

export function statusLabel(status: string, project?: TaskProject) {
  return (
    workflowColumn(status, project)?.label ??
    STATUS_LABELS[status as BaseIssueStatus] ??
    status.replaceAll("_", " ")
  );
}

export function boardColumns(
  issues: TaskIssue[],
  projects: TaskProject[],
  projectId: string | null,
): TaskWorkflowColumn[] {
  const selected = projects.find((project) => project.id === projectId);
  const active = activeProjects(projects).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  const configured = selected
    ? visibleProjectWorkflow(selected)
    : [
        ...DEFAULT_WORKFLOW.filter(
          (column) =>
            active.length === 0 ||
            active.some((project) =>
              visibleProjectWorkflow(project).some(
                (candidate) => candidate.id === column.id,
              ),
            ),
        ),
        ...active.flatMap((project) =>
          visibleProjectWorkflow(project).filter(
            (column) =>
              !(BOARD_STATUSES as readonly string[]).includes(column.id),
          ),
        ),
      ];
  const seen = new Set<string>();
  const result = configured.filter((column) => {
    if (seen.has(column.id)) return false;
    seen.add(column.id);
    return true;
  });
  for (const issue of issues) {
    if (!seen.has(issue.status) && issue.status !== "backlog") {
      const owner = projects.find((project) => project.id === issue.project);
      if (isHiddenProjectStatus(issue.status, owner)) continue;
      result.push({
        id: issue.status,
        label: statusLabel(issue.status, owner),
        category: workflowColumn(issue.status, owner)?.category ?? "unstarted",
      });
      seen.add(issue.status);
    }
  }
  return result;
}

export function validStatusForProject(status: string, project?: TaskProject) {
  return status === "backlog" || Boolean(workflowColumn(status, project));
}

export function visibleStatusForProject(status: string, project?: TaskProject) {
  return (
    validStatusForProject(status, project) &&
    !isHiddenProjectStatus(status, project)
  );
}

export function customWorkflowId(projectId: string, label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${projectId}--${slug || "column"}`;
}

export function isBaseBoardStatus(status: string) {
  return (BOARD_STATUSES as readonly string[]).includes(status);
}
