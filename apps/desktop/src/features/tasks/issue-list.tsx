import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import { LIST_VIRTUALIZE_AFTER } from "@/features/tasks/constants";
import {
  filterIssues,
  groupIssues,
  type IssueFilter,
  type IssueGroupBy,
  type IssueSort,
  sortIssues,
} from "@/features/tasks/filter-issues";
import {
  IssueColumnHeader,
  issueColumnWidth,
} from "@/features/tasks/issue-column-header";
import { IssueContextMenu } from "@/features/tasks/issue-context-menu";
import type { TaskVisibleProperty } from "@/features/tasks/task-selectors";
import {
  TaskDate,
  TaskLabels,
  TaskPriority,
  TaskProjectChip,
  TaskState,
  TaskStatus,
} from "@/features/tasks/task-ui";
import { statusLabel } from "@/features/tasks/workflow";
import type { IssueColumnId } from "@/lib/copper/task-settings";
import type {
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

const COLUMN_LABELS: Record<IssueColumnId, string> = {
  id: "Id",
  title: "Title",
  status: "Status",
  priority: "Priority",
  project: "Project",
  labels: "Labels",
  due: "Due",
};

export function IssueList({
  issues,
  filter,
  groupBy,
  sort,
  project,
  query,
  visibleProperties,
  projects,
  selectedIds,
  onOpen,
  onFocus,
  onToggle,
  onRange,
  onContext,
  onUpdate,
  onEditLabels,
  onDuplicate,
  onClearFilters,
  columnWidths,
  onColumnWidthsChange,
}: {
  issues: TaskIssue[];
  filter: IssueFilter;
  groupBy: IssueGroupBy;
  sort: IssueSort;
  project: string | null;
  query: string;
  visibleProperties: ReadonlySet<TaskVisibleProperty>;
  projects: TaskProject[];
  selectedIds: ReadonlySet<string>;
  onOpen: (id: string, mode: "peek" | "tab") => void;
  onFocus: (id: string) => void;
  onToggle: (id: string) => void;
  onRange: (id: string, order: string[]) => void;
  onContext: (id: string) => void;
  onUpdate: (ids: string[], input: UpdateIssueInput) => void;
  onEditLabels: (ids: string[]) => void;
  onDuplicate?: (issue: TaskIssue) => void;
  onClearFilters: () => void;
  columnWidths: Partial<Record<IssueColumnId, number>>;
  onColumnWidthsChange: (
    widths: Partial<Record<IssueColumnId, number>>,
  ) => void;
}) {
  const grouped = useMemo(
    () =>
      groupIssues(
        sortIssues(
          filterIssues(issues, filter, project, query, projects),
          sort,
        ),
        groupBy,
      ),
    [filter, groupBy, issues, project, projects, query, sort],
  );
  const flat = useMemo(
    () =>
      grouped.flatMap((group) => [
        ...(groupBy === "none"
          ? []
          : [
              {
                kind: "header" as const,
                key: `h-${group.key}`,
                label: group.label,
              },
            ]),
        ...group.issues.map((issue) => ({
          kind: "issue" as const,
          key: issue.id,
          issue,
        })),
      ]),
    [groupBy, grouped],
  );
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualize = flat.length > LIST_VIRTUALIZE_AFTER;
  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 42,
    enabled: virtualize,
  });
  const columns = 2 + visibleProperties.size;
  const columnIds: IssueColumnId[] = [
    "id",
    "title",
    ...(["status", "priority", "project", "labels", "due"] as const).filter(
      (id) => visibleProperties.has(id),
    ),
  ];
  const tableWidth = columnIds.reduce(
    (total, id) => total + issueColumnWidth(id, columnWidths),
    0,
  );
  const order = flat
    .filter((item) => item.kind === "issue")
    .map((item) => item.issue.id);

  if (flat.length === 0) {
    return (
      <TaskState
        kind="empty"
        title={query ? "No matching issues" : "No issues here"}
        detail={
          query
            ? "Try another search or clear the current controls."
            : "Create an issue to start this view."
        }
        action={
          query ? (
            <button
              type="button"
              className="copper-text-button"
              onClick={onClearFilters}
            >
              Clear filters
            </button>
          ) : undefined
        }
      />
    );
  }

  const rows = virtualize
    ? virtualizer.getVirtualItems().map((item) => ({
        item: flat[item.index],
        style: {
          position: "absolute" as const,
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${item.start}px)`,
        },
      }))
    : flat.map((item) => ({ item, style: undefined }));

  return (
    <div ref={parentRef} className="copper-scroll copper-task-list">
      <table className="copper-task-table" style={{ width: tableWidth }}>
        <colgroup>
          {columnIds.map((id) => (
            <col
              key={id}
              style={{ width: issueColumnWidth(id, columnWidths) }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columnIds.map((id) => (
              <IssueColumnHeader
                key={id}
                id={id}
                label={COLUMN_LABELS[id]}
                width={issueColumnWidth(id, columnWidths)}
                onChange={(width) =>
                  onColumnWidthsChange({ ...columnWidths, [id]: width })
                }
                onReset={() => {
                  const next = { ...columnWidths };
                  delete next[id];
                  onColumnWidthsChange(next);
                }}
              />
            ))}
          </tr>
        </thead>
        <tbody
          style={
            virtualize
              ? { height: virtualizer.getTotalSize(), position: "relative" }
              : undefined
          }
        >
          {rows.map(({ item, style }) => {
            if (!item) return null;
            if (item.kind === "header") {
              return (
                <tr
                  key={item.key}
                  className="copper-task-table-group"
                  style={style}
                >
                  <th colSpan={columns}>{item.label}</th>
                </tr>
              );
            }
            const issue = item.issue;
            const targets = issues.filter((item) => selectedIds.has(item.id));
            return (
              <IssueContextMenu
                key={issue.id}
                issue={issue}
                targets={targets}
                projects={projects}
                onOpenChange={(open) => {
                  if (open) onContext(issue.id);
                }}
                onOpen={() => onOpen(issue.id, "peek")}
                onOpenInNewTab={() => onOpen(issue.id, "tab")}
                onUpdate={onUpdate}
                onEditLabels={onEditLabels}
                onDuplicate={onDuplicate}
              >
                <tr
                  tabIndex={0}
                  data-selected={selectedIds.has(issue.id)}
                  style={style}
                  onFocus={() => onFocus(issue.id)}
                  onClick={(event) => {
                    event.currentTarget.focus();
                    if (event.shiftKey) onRange(issue.id, order);
                    else
                      onOpen(
                        issue.id,
                        event.metaKey || event.ctrlKey ? "tab" : "peek",
                      );
                  }}
                  onKeyDown={(event) => {
                    if (event.key.toLowerCase() === "x") {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggle(issue.id);
                    } else if (event.key === "Enter") {
                      onOpen(issue.id, "peek");
                    }
                  }}
                >
                  <td className="copper-task-id">{issue.id}</td>
                  <td className="copper-task-table-title">{issue.title}</td>
                  {visibleProperties.has("status") ? (
                    <td>
                      <TaskStatus
                        value={issue.status}
                        label={statusLabel(
                          issue.status,
                          projects.find(
                            (project) => project.id === issue.project,
                          ),
                        )}
                      />
                    </td>
                  ) : null}
                  {visibleProperties.has("priority") ? (
                    <td>
                      <TaskPriority value={issue.priority} />
                    </td>
                  ) : null}
                  {visibleProperties.has("project") ? (
                    <td>
                      {issue.project ? (
                        <TaskProjectChip
                          icon={
                            projects.find(
                              (project) => project.id === issue.project,
                            )?.icon
                          }
                        >
                          {projects.find(
                            (project) => project.id === issue.project,
                          )?.title ?? issue.project}
                        </TaskProjectChip>
                      ) : null}
                    </td>
                  ) : null}
                  {visibleProperties.has("labels") ? (
                    <td>
                      <TaskLabels labels={issue.labels} />
                    </td>
                  ) : null}
                  {visibleProperties.has("due") ? (
                    <td>
                      <TaskDate value={issue.due} />
                    </td>
                  ) : null}
                </tr>
              </IssueContextMenu>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
