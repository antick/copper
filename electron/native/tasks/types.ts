import type { IssuePriority, IssueStatus, ProjectStatus } from "./constants";

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
  icon: string;
  workflow: TaskWorkflowColumn[];
  archived: boolean;
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
