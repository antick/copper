import { type Dispatch, useCallback, useRef, useState } from "react";
import { type TaskTabsAction, taskTabId } from "@/features/tasks/task-tabs";
import type { TasksDestination, TasksView } from "@/lib/copper/settings";

export type TaskComposerState =
  | { kind: "issue"; project: string | null; status: string }
  | { kind: "project"; project: null; status: "todo" };

export function useTaskComposer() {
  const [composer, setComposer] = useState<TaskComposerState | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const openComposer = useCallback(
    (
      kind: TaskComposerState["kind"],
      defaults?: { project?: string | null; status?: string },
    ) => {
      focusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setComposer(
        kind === "issue"
          ? {
              kind,
              project: defaults?.project ?? null,
              status: defaults?.status ?? "todo",
            }
          : { kind, project: null, status: "todo" },
      );
    },
    [],
  );
  const closeComposer = useCallback(() => {
    setComposer(null);
    window.setTimeout(() => focusRef.current?.focus(), 0);
  }, []);
  return {
    composer,
    openComposer,
    closeComposer,
    takeFocus: () => {
      const focused = focusRef.current;
      focusRef.current = null;
      return focused;
    },
  };
}

export function useIssuePeek(
  issueTabId: string | null,
  onTabsAction: Dispatch<TaskTabsAction>,
  onFocus: (id: string) => void,
) {
  const [peekIssueId, setPeekIssueId] = useState<string | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const selectedIssueId = peekIssueId ?? issueTabId;
  const openIssue = useCallback(
    (id: string) => {
      if (!selectedIssueId) {
        focusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      }
      setPeekIssueId(id);
    },
    [selectedIssueId],
  );
  const openIssueTab = useCallback(
    (id: string) => {
      onTabsAction({
        type: "open-pinned",
        id: taskTabId(),
        target: { kind: "issue", issue: id },
      });
      setPeekIssueId(null);
    },
    [onTabsAction],
  );
  const handleOpenIssue = useCallback(
    (id: string, mode: "peek" | "tab") => {
      onFocus(id);
      if (mode === "tab") openIssueTab(id);
      else openIssue(id);
    },
    [onFocus, openIssue, openIssueTab],
  );
  const closeIssue = useCallback(() => {
    setPeekIssueId(null);
    window.setTimeout(() => focusRef.current?.focus(), 0);
  }, []);
  return {
    peekIssueId,
    selectedIssueId,
    openIssue,
    openIssueTab,
    handleOpenIssue,
    closeIssue,
  };
}

export function useTaskNavigation({
  destination,
  project,
  view,
  onTabsAction,
  onNavigate,
}: {
  destination: TasksDestination;
  project: string | null;
  view: TasksView;
  onTabsAction: Dispatch<TaskTabsAction>;
  onNavigate: () => void;
}) {
  return {
    selectDestination(
      next: TasksDestination,
      mode: "current" | "tab" = "current",
    ) {
      if (next === "project") return;
      const target = {
        kind: "destination" as const,
        destination: next,
        view:
          next === "backlog" || next === "completed" ? ("list" as const) : view,
      };
      onTabsAction(
        mode === "tab"
          ? { type: "open-pinned", id: taskTabId(), target }
          : { type: "navigate", target },
      );
      onNavigate();
    },
    selectProject(id: string, mode: "current" | "tab" = "current") {
      const target = {
        kind: "project" as const,
        project: id,
        view: "overview" as const,
      };
      onTabsAction(
        mode === "tab"
          ? { type: "open-pinned", id: taskTabId(), target }
          : { type: "navigate", target },
      );
      onNavigate();
    },
    navigateView(next: TasksView) {
      onTabsAction({
        type: "navigate",
        target:
          destination === "project" && project
            ? {
                kind: "project",
                project,
                view: next === "board" ? "board" : "issues",
              }
            : {
                kind: "destination",
                destination: destination === "project" ? "all" : destination,
                view: next,
              },
      });
    },
  };
}
