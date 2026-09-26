import { ISSUE_PRIORITIES, PRIORITY_ORDER } from "@/features/tasks/constants";
import { issueCategory } from "@/features/tasks/workflow";
import type {
  IssuePriority,
  IssueStatus,
  TaskIssue,
  TaskProject,
} from "@/lib/copper/tasks";

export type IssueFilter = "all" | "active" | "backlog" | "done";
export type IssueGroupBy = "none" | "status" | "priority" | "project" | "label";
export type IssueSort = "rank" | "updated" | "priority" | "due" | "id";

export function filterIssues(
  issues: TaskIssue[],
  filter: IssueFilter,
  project: string | null,
  query: string,
  projects: TaskProject[] = [],
): TaskIssue[] {
  const needle = query.trim().toLowerCase();
  return issues.filter((issue) => {
    if (project && issue.project !== project) {
      return false;
    }
    const category = issueCategory(issue, projects);
    if (
      filter === "active" &&
      category !== "unstarted" &&
      category !== "started"
    ) {
      return false;
    }
    if (filter === "backlog" && issue.status !== "backlog") {
      return false;
    }
    if (filter === "done" && category !== "completed") {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [issue.id, issue.title, issue.project ?? "", ...issue.labels]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export function matchesIssueSearch(issue: TaskIssue, query: string) {
  const needle = query.trim().toLowerCase();
  return (
    !needle ||
    [issue.id, issue.title, issue.project ?? "", ...issue.labels]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

export function sortIssues(issues: TaskIssue[], sort: IssueSort): TaskIssue[] {
  return [...issues].sort((a, b) => {
    if (sort === "rank") {
      return a.rank.localeCompare(b.rank) || a.id.localeCompare(b.id);
    }
    if (sort === "updated") {
      return b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id);
    }
    if (sort === "priority") {
      return (
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        a.id.localeCompare(b.id)
      );
    }
    if (sort === "due") {
      return (
        (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
        a.id.localeCompare(b.id)
      );
    }
    return a.id.localeCompare(b.id);
  });
}

export function groupIssues(
  issues: TaskIssue[],
  groupBy: IssueGroupBy,
): Array<{ key: string; label: string; issues: TaskIssue[] }> {
  if (groupBy === "none") {
    return [{ key: "all", label: "Issues", issues }];
  }
  const groups = new Map<string, TaskIssue[]>();
  for (const issue of issues) {
    const keys =
      groupBy === "label"
        ? issue.labels.length > 0
          ? issue.labels
          : ["(no label)"]
        : [
            groupBy === "project"
              ? (issue.project ?? "Unscoped")
              : groupBy === "priority"
                ? issue.priority
                : issue.status,
          ];
    for (const key of keys) {
      const list = groups.get(key) ?? [];
      list.push(issue);
      groups.set(key, list);
    }
  }
  return [...groups.entries()].map(([key, grouped]) => ({
    key,
    label: key,
    issues: grouped,
  }));
}

export function cycleStatus(status: IssueStatus): IssueStatus {
  const order: IssueStatus[] = [
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "canceled",
  ];
  return order[(order.indexOf(status) + 1) % order.length] as IssueStatus;
}

export function cyclePriority(priority: IssuePriority): IssuePriority {
  const index = ISSUE_PRIORITIES.indexOf(priority);
  return ISSUE_PRIORITIES[
    (index + 1) % ISSUE_PRIORITIES.length
  ] as IssuePriority;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.closest(".cm-editor")) {
    return true;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable === true
  );
}
