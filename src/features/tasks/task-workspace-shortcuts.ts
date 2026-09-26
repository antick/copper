import { type Dispatch, type RefObject, useEffect } from "react";
import {
  cyclePriority,
  cycleStatus,
  isTypingTarget,
} from "@/features/tasks/filter-issues";
import type { TaskTabsAction } from "@/features/tasks/task-tabs";
import type { TasksTabTarget, TasksView } from "@/lib/copper/settings";
import type {
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

const TASK_COMMANDS = [
  "copper:new-issue",
  "copper:new-project",
  "copper:toggle-tasks-view",
  "copper:set-issue-status",
  "copper:set-issue-priority",
  "copper:set-issue-labels",
  "copper:next-issue",
  "copper:previous-issue",
] as const;

export function useTaskTargetValidation({
  target,
  issues,
  projects,
  pending,
  dispatch,
}: {
  target: TasksTabTarget;
  issues: TaskIssue[];
  projects: TaskProject[];
  pending: boolean;
  dispatch: Dispatch<TaskTabsAction>;
}) {
  useEffect(() => {
    if (pending) return;
    const missing =
      (target.kind === "issue" &&
        !issues.some((item) => item.id === target.issue)) ||
      (target.kind === "project" &&
        !projects.some((item) => item.id === target.project));
    if (missing)
      dispatch({
        type: "replace",
        target: { kind: "destination", destination: "all", view: "board" },
      });
  }, [dispatch, issues, pending, projects, target]);
}

export function useTaskWorkspaceShortcuts({
  issues,
  navigableIssues,
  selectedIssueId,
  selectedCount,
  focusedId,
  composerOpen,
  view,
  searchRef,
  onOpenComposer,
  onCloseComposer,
  onCloseIssue,
  onOpenIssue,
  onNavigateView,
  onUpdateIssue,
  onClearSelection,
  onToggleSelection,
}: {
  issues: TaskIssue[];
  navigableIssues: TaskIssue[];
  selectedIssueId: string | null;
  selectedCount: number;
  focusedId: string | null;
  composerOpen: boolean;
  view: TasksView;
  searchRef: RefObject<HTMLInputElement | null>;
  onOpenComposer: (kind: "issue" | "project") => void;
  onCloseComposer: () => void;
  onCloseIssue: () => void;
  onOpenIssue: (id: string) => void;
  onNavigateView: (view: TasksView) => void;
  onUpdateIssue: (id: string, input: UpdateIssueInput) => void;
  onClearSelection: () => void;
  onToggleSelection: (id: string) => void;
}) {
  useEffect(() => {
    const onCommand = (event: Event) => {
      if (event.type === "copper:new-issue") onOpenComposer("issue");
      if (event.type === "copper:new-project") onOpenComposer("project");
      if (event.type === "copper:toggle-tasks-view")
        onNavigateView(view === "board" ? "list" : "board");
      const current = issues.find((issue) => issue.id === selectedIssueId);
      if (!current) return;
      if (event.type === "copper:set-issue-status")
        onUpdateIssue(current.id, { status: cycleStatus(current.status) });
      if (event.type === "copper:set-issue-priority")
        onUpdateIssue(current.id, {
          priority: cyclePriority(current.priority),
        });
      if (event.type === "copper:set-issue-labels") {
        const value = window.prompt("Labels (comma separated)");
        if (value !== null)
          onUpdateIssue(current.id, {
            labels: value
              .split(",")
              .map((label) => label.trim())
              .filter(Boolean),
          });
      }
      const delta =
        event.type === "copper:next-issue"
          ? 1
          : event.type === "copper:previous-issue"
            ? -1
            : 0;
      const index = navigableIssues.findIndex(
        (issue) => issue.id === current.id,
      );
      const next = navigableIssues[index + delta];
      if (delta && next) onOpenIssue(next.id);
    };
    for (const event of TASK_COMMANDS)
      window.addEventListener(event, onCommand);
    return () => {
      for (const event of TASK_COMMANDS)
        window.removeEventListener(event, onCommand);
    };
  }, [
    issues,
    navigableIssues,
    onNavigateView,
    onOpenComposer,
    onOpenIssue,
    onUpdateIssue,
    selectedIssueId,
    view,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        isTypingTarget(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        onOpenComposer("issue");
      } else if (key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (selectedCount) onClearSelection();
        else if (composerOpen) onCloseComposer();
        else onCloseIssue();
      } else if (key === "x" && focusedId) {
        event.preventDefault();
        onToggleSelection(focusedId);
      } else {
        const delta =
          key === "j" || event.key === "ArrowDown"
            ? 1
            : key === "k" || event.key === "ArrowUp"
              ? -1
              : 0;
        if (delta) {
          event.preventDefault();
          const index = navigableIssues.findIndex(
            (issue) => issue.id === selectedIssueId,
          );
          const bounded = Math.max(
            0,
            Math.min(
              navigableIssues.length - 1,
              (index < 0 ? (delta > 0 ? -1 : 0) : index) + delta,
            ),
          );
          const next = navigableIssues[bounded];
          if (next) onOpenIssue(next.id);
        } else if (event.key === "Enter" && !selectedIssueId) {
          const first = navigableIssues[0];
          if (first) {
            event.preventDefault();
            onOpenIssue(first.id);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    composerOpen,
    focusedId,
    navigableIssues,
    onClearSelection,
    onCloseComposer,
    onCloseIssue,
    onOpenComposer,
    onOpenIssue,
    onToggleSelection,
    searchRef,
    selectedCount,
    selectedIssueId,
  ]);
}
