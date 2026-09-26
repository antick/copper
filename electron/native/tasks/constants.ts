export const TASKS_DIR = "Tasks";
export const ISSUES_DIR = "Tasks/Issues";
export const PROJECTS_DIR = "Tasks/Projects";

export const TYPE_ISSUE = "issue";
export const TYPE_PROJECT = "project";

export const ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
] as const;

export const BOARD_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
] as const;

export const ISSUE_PRIORITIES = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const PROJECT_STATUSES = [
  "planned",
  "started",
  "paused",
  "completed",
  "canceled",
] as const;

export const DEFAULT_ISSUE_STATUS = "todo";
export const DEFAULT_ISSUE_PRIORITY = "none";
export const DEFAULT_PROJECT_STATUS = "planned";

export const FRONTMATTER_KEYS = {
  type: "type",
  id: "id",
  status: "status",
  priority: "priority",
  project: "project",
  labels: "labels",
  due: "due",
  rank: "rank",
  created: "created",
  updated: "updated",
  comments: "comments",
  start: "start",
  target: "target",
  icon: "icon",
  workflow: "workflow",
} as const;

export const SLUG_MAX_LENGTH = 60;

export type BaseIssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssueStatus = string;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type BoardStatus = (typeof BOARD_STATUSES)[number];
