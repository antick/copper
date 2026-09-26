import { Plus } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  filterIssues,
  type IssueFilter,
  type IssueGroupBy,
  type IssueSort,
  sortIssues,
} from "@/features/tasks/filter-issues";
import { IssueBoard } from "@/features/tasks/issue-board";
import { IssueList } from "@/features/tasks/issue-list";
import type { TaskVisibleProperty } from "@/features/tasks/task-selectors";
import { TaskMutationError, TaskState } from "@/features/tasks/task-ui";
import type { TasksView } from "@/lib/copper/settings";
import type { IssueColumnId } from "@/lib/copper/task-settings";
import type {
  TaskIssue,
  TaskProject,
  TaskWorkflowColumn,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

export function IssueSurface({
  title,
  showHeader = true,
  view,
  issues,
  projects,
  project,
  pending,
  error,
  mutationError,
  onRetryMutation,
  toolbar,
  filter,
  groupBy,
  sort,
  query,
  visibleProperties,
  selectedIds,
  onRetry,
  onSearch,
  onFilter,
  onOpenIssue,
  onFocusIssue,
  onToggleIssue,
  onRangeIssue,
  onContextIssue,
  onUpdateIssues,
  onEditLabels,
  onDuplicate,
  columnWidths,
  onColumnWidthsChange,
  onMove,
  onMoveRejected,
  onNewIssue,
  onAddColumn,
  onRenameColumn,
  onMoveColumn,
  onReorderColumn,
  onHideColumn,
  onShowColumn,
  onArchiveColumn,
}: {
  title: string;
  showHeader?: boolean;
  view: TasksView;
  issues: TaskIssue[];
  projects: TaskProject[];
  project: string | null;
  pending: boolean;
  error: boolean;
  mutationError: Error | null;
  onRetryMutation: () => void;
  toolbar?: ReactNode;
  filter: IssueFilter;
  groupBy: IssueGroupBy;
  sort: IssueSort;
  query: string;
  visibleProperties: ReadonlySet<TaskVisibleProperty>;
  selectedIds: ReadonlySet<string>;
  onRetry: () => void;
  onSearch: (value: string) => void;
  onFilter: (value: IssueFilter) => void;
  onOpenIssue: (id: string, mode: "peek" | "tab") => void;
  onFocusIssue: (id: string) => void;
  onToggleIssue: (id: string) => void;
  onRangeIssue: (id: string, order: string[]) => void;
  onContextIssue: (id: string) => void;
  onUpdateIssues: (ids: string[], input: UpdateIssueInput) => void;
  onEditLabels: (ids: string[]) => void;
  onDuplicate?: (issue: TaskIssue) => void;
  columnWidths: Partial<Record<IssueColumnId, number>>;
  onColumnWidthsChange: (
    widths: Partial<Record<IssueColumnId, number>>,
  ) => void;
  onMove: Parameters<typeof IssueBoard>[0]["onMove"];
  onMoveRejected: (message: string) => void;
  onNewIssue: (status?: string) => void;
  onAddColumn?: () => void;
  onRenameColumn?: (column: TaskWorkflowColumn) => void;
  onMoveColumn?: (column: TaskWorkflowColumn, direction: -1 | 1) => void;
  onReorderColumn?: (fromId: string, toId: string) => void;
  onHideColumn?: (column: TaskWorkflowColumn) => void;
  onShowColumn?: (column: TaskWorkflowColumn) => void;
  onArchiveColumn?: (column: TaskWorkflowColumn) => void;
}) {
  const boardIssues = useMemo(
    () =>
      sortIssues(filterIssues(issues, filter, project, query, projects), sort),
    [filter, issues, project, projects, query, sort],
  );
  return (
    <section className="copper-task-content" aria-label={title}>
      {showHeader ? (
        <header className="copper-task-content-header">
          <div className="copper-task-header-title">
            <h1>{title}</h1>
          </div>
          {toolbar ? (
            <div className="copper-task-header-middle">{toolbar}</div>
          ) : (
            <span className="copper-task-header-middle" />
          )}
          <Tooltip content="New issue">
            <IconButton label="New issue" onClick={() => onNewIssue()}>
              <Plus size={16} aria-hidden />
            </IconButton>
          </Tooltip>
        </header>
      ) : null}
      <TaskMutationError
        message={mutationError?.message}
        onRetry={mutationError ? onRetryMutation : undefined}
      />
      {pending ? (
        <TaskState kind="loading" title="Loading issues" />
      ) : error ? (
        <TaskState
          kind="error"
          title="Issues could not be loaded"
          action={
            <button
              type="button"
              className="copper-text-button"
              onClick={onRetry}
            >
              Retry
            </button>
          }
        />
      ) : view === "board" ? (
        <IssueBoard
          issues={boardIssues}
          project={project}
          projects={projects}
          selectedIds={selectedIds}
          visibleProperties={visibleProperties}
          onDuplicate={onDuplicate}
          onOpen={onOpenIssue}
          onFocus={onFocusIssue}
          onToggle={onToggleIssue}
          onRange={onRangeIssue}
          onContext={onContextIssue}
          onUpdate={onUpdateIssues}
          onEditLabels={onEditLabels}
          onMove={onMove}
          onMoveRejected={onMoveRejected}
          onNewIssue={onNewIssue}
          onAddColumn={onAddColumn}
          onRenameColumn={onRenameColumn}
          onMoveColumn={onMoveColumn}
          onReorderColumn={onReorderColumn}
          onHideColumn={onHideColumn}
          onShowColumn={onShowColumn}
          onArchiveColumn={onArchiveColumn}
        />
      ) : (
        <IssueList
          issues={issues}
          projects={projects}
          filter={filter}
          groupBy={groupBy}
          sort={sort}
          project={project}
          query={query}
          visibleProperties={visibleProperties}
          selectedIds={selectedIds}
          onOpen={onOpenIssue}
          onFocus={onFocusIssue}
          onToggle={onToggleIssue}
          onRange={onRangeIssue}
          onContext={onContextIssue}
          onUpdate={onUpdateIssues}
          onEditLabels={onEditLabels}
          onDuplicate={onDuplicate}
          columnWidths={columnWidths}
          onColumnWidthsChange={onColumnWidthsChange}
          onClearFilters={() => {
            onSearch("");
            onFilter("all");
          }}
        />
      )}
    </section>
  );
}
