import { Plus, RotateCcw } from "lucide-react";
import type { Dispatch } from "react";
import { WorkspaceTopBar } from "@/components/shell/workspace-top-bar";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  type TaskTabsAction,
  type TaskTabsState,
  taskTabId,
} from "@/features/tasks/task-tabs";
import type { TaskIssue, TaskProject } from "@/lib/copper/tasks";

const DESTINATION_LABELS = {
  all: "All issues",
  active: "Active",
  backlog: "Backlog",
  completed: "Completed",
  projects: "Projects",
} as const;

function tabLabel(
  tab: TaskTabsState["tabs"][number],
  issues: TaskIssue[],
  projects: TaskProject[],
) {
  const target = tab.target;
  if (target.kind === "issue") {
    const issue = issues.find((item) => item.id === target.issue);
    return issue ? `${issue.id} · ${issue.title}` : target.issue;
  }
  if (target.kind === "project") {
    return (
      projects.find((item) => item.id === target.project)?.title ??
      target.project
    );
  }
  return DESTINATION_LABELS[target.destination];
}

export function TaskTopBar({
  state,
  dispatch,
  issues,
  projects,
  leftCollapsed,
  onRestoreSidebar,
}: {
  state: TaskTabsState;
  dispatch: Dispatch<TaskTabsAction>;
  issues: TaskIssue[];
  projects: TaskProject[];
  leftCollapsed: boolean;
  onRestoreSidebar: () => void;
}) {
  const active = state.tabs.find((tab) => tab.id === state.activeTabId);
  return (
    <WorkspaceTopBar
      tabs={state.tabs.map((tab) => ({
        id: tab.id,
        label: tabLabel(tab, issues, projects),
        preview: tab.preview,
      }))}
      activeId={state.activeTabId}
      tabListLabel="Open task tabs"
      onActivateTab={(id) => dispatch({ type: "activate", id })}
      onPinTab={(id) => dispatch({ type: "pin", id })}
      onCloseTab={(id) => dispatch({ type: "close", id })}
      onReorderTab={(from, to) => dispatch({ type: "reorder", from, to })}
      canGoBack={Boolean(active?.back.length)}
      canGoForward={Boolean(active?.forward.length)}
      onBack={() => dispatch({ type: "back" })}
      onForward={() => dispatch({ type: "forward" })}
      onRestoreSidebar={leftCollapsed ? onRestoreSidebar : undefined}
      firstVisible={leftCollapsed}
      actions={
        <>
          <Tooltip content="New task tab">
            <IconButton
              label="New task tab"
              onClick={() =>
                dispatch({
                  type: "open-preview",
                  id: taskTabId(),
                  target: {
                    kind: "destination",
                    destination: "all",
                    view: "board",
                  },
                })
              }
            >
              <Plus size={16} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Restore closed task tab">
            <IconButton
              label="Restore closed task tab"
              disabled={state.closed.length === 0}
              onClick={() => dispatch({ type: "reopen" })}
            >
              <RotateCcw size={15} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
        </>
      }
    />
  );
}
