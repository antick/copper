export const TASKS_DIR = "Tasks";
export const ISSUES_DIR = "Tasks/Issues";
export const PROJECTS_DIR = "Tasks/Projects";

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

export const STATUS_LABELS: Record<(typeof ISSUE_STATUSES)[number], string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  canceled: "Canceled",
};

export const PRIORITY_LABELS: Record<
  (typeof ISSUE_PRIORITIES)[number],
  string
> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PROJECT_STATUS_LABELS: Record<
  (typeof PROJECT_STATUSES)[number],
  string
> = {
  planned: "Planned",
  started: "Started",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
};

export const PRIORITY_ORDER: Record<(typeof ISSUE_PRIORITIES)[number], number> =
  {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
  };

export const BOARD_VIRTUALIZE_AFTER = 80;
export const BOARD_KEYBOARD_SCROLL_STEP = 280;
export const LIST_VIRTUALIZE_AFTER = 80;

export const DESTINATION_LABELS = {
  all: "All issues",
  active: "Active issues",
  backlog: "Backlog",
  completed: "Completed",
  projects: "Projects",
} as const;
