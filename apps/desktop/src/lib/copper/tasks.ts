import { copperInvoke } from "@/lib/copper/invoke";

export type BaseIssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled";
export type IssueStatus = string;
export type IssuePriority = "none" | "low" | "medium" | "high" | "urgent";
export type ProjectStatus =
  | "planned"
  | "started"
  | "paused"
  | "completed"
  | "canceled";
export type WorkflowCategory =
  | "unstarted"
  | "started"
  | "completed"
  | "canceled";

export interface TaskWorkflowColumn {
  id: string;
  label: string;
  category: WorkflowCategory;
  hidden?: boolean;
}

export interface TaskComment {
  id: string;
  body: string;
  created: string;
  updated: string;
}

export interface TaskIssue {
  path: string;
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  project: string | null;
  labels: string[];
  due: string | null;
  rank: string;
  created: string;
  updated: string;
  comments?: TaskComment[];
  body?: string;
}

export interface TaskProjectCounts {
  [status: string]: number;
  backlog: number;
  todo: number;
  in_progress: number;
  in_review: number;
  done: number;
  canceled: number;
}

export interface TaskProject {
  path: string;
  id: string;
  title: string;
  status: ProjectStatus;
  labels: string[];
  start: string | null;
  target: string | null;
  icon?: string;
  workflow?: TaskWorkflowColumn[];
  archived?: boolean;
  counts: TaskProjectCounts;
  body?: string;
}

export interface CreateIssueInput {
  title: string;
  project?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  labels?: string[];
  due?: string | null;
  body?: string;
  afterId?: string | null;
}

export interface UpdateIssueInput {
  title?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  project?: string | null;
  labels?: string[];
  due?: string | null;
  rank?: string;
  body?: string;
}

export interface MoveIssueInput {
  status?: IssueStatus;
  afterId?: string | null;
  beforeId?: string | null;
}

export interface CreateProjectInput {
  name: string;
  status?: ProjectStatus;
  labels?: string[];
  start?: string | null;
  target?: string | null;
  icon?: string;
  workflow?: TaskWorkflowColumn[];
}

export interface UpdateProjectInput {
  title?: string;
  status?: ProjectStatus;
  labels?: string[];
  start?: string | null;
  target?: string | null;
  icon?: string;
  workflow?: TaskWorkflowColumn[];
  body?: string;
}

export interface UpdateProjectWorkflowInput {
  workflow: TaskWorkflowColumn[];
  archivedStatusId?: string;
  fallbackStatusId?: string;
}

export function listIssues(vaultId: string): Promise<TaskIssue[]> {
  return copperInvoke<TaskIssue[]>("list_issues", { vaultId });
}

export function getIssue(vaultId: string, id: string): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("get_issue", { vaultId, id });
}

export function createIssue(
  vaultId: string,
  input: CreateIssueInput,
): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("create_issue", { vaultId, ...input });
}

export function updateIssue(
  vaultId: string,
  id: string,
  input: UpdateIssueInput,
): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("update_issue", { vaultId, id, ...input });
}

export function moveIssue(
  vaultId: string,
  id: string,
  input: MoveIssueInput,
): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("move_issue", { vaultId, id, ...input });
}

export function addIssueComment(
  vaultId: string,
  id: string,
  body: string,
): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("add_issue_comment", {
    vaultId,
    id,
    body,
  });
}

export function updateIssueComment(
  vaultId: string,
  id: string,
  commentId: string,
  body: string,
): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("update_issue_comment", {
    vaultId,
    id,
    commentId,
    body,
  });
}

export function deleteIssueComment(
  vaultId: string,
  id: string,
  commentId: string,
): Promise<TaskIssue> {
  return copperInvoke<TaskIssue>("delete_issue_comment", {
    vaultId,
    id,
    commentId,
  });
}

export function listProjects(vaultId: string): Promise<TaskProject[]> {
  return copperInvoke<TaskProject[]>("list_projects", { vaultId });
}

export function getProject(vaultId: string, id: string): Promise<TaskProject> {
  return copperInvoke<TaskProject>("get_project", { vaultId, id });
}

export function createProject(
  vaultId: string,
  input: CreateProjectInput,
): Promise<TaskProject> {
  return copperInvoke<TaskProject>("create_project", { vaultId, ...input });
}

export function updateProject(
  vaultId: string,
  id: string,
  input: UpdateProjectInput,
): Promise<TaskProject> {
  return copperInvoke<TaskProject>("update_project", { vaultId, id, ...input });
}

export function updateProjectWorkflow(
  vaultId: string,
  id: string,
  input: UpdateProjectWorkflowInput,
): Promise<TaskProject> {
  return copperInvoke<TaskProject>("update_project_workflow", {
    vaultId,
    id,
    ...input,
  });
}

export function archiveProject(vaultId: string, id: string): Promise<void> {
  return copperInvoke<void>("archive_project", { vaultId, id });
}

export function deleteProject(vaultId: string, id: string): Promise<void> {
  return copperInvoke<void>("delete_project", { vaultId, id });
}
