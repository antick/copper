import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { boardCardAnimateLayoutChanges } from "@/features/tasks/issue-board-dnd";
import { IssueContextMenu } from "@/features/tasks/issue-context-menu";
import type { TaskVisibleProperty } from "@/features/tasks/task-selectors";
import {
  TaskDate,
  TaskLabels,
  TaskPriority,
  TaskProjectChip,
} from "@/features/tasks/task-ui";
import type {
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

export interface IssueBoardActions {
  selectedIds: ReadonlySet<string>;
  selectedIssues: TaskIssue[];
  order: string[];
  projects: TaskProject[];
  visibleProperties: ReadonlySet<TaskVisibleProperty>;
  onOpen: (id: string, mode: "peek" | "tab") => void;
  onFocus: (id: string) => void;
  onToggle: (id: string) => void;
  onRange: (id: string, order: string[]) => void;
  onContext: (id: string) => void;
  onUpdate: (ids: string[], input: UpdateIssueInput) => void;
  onEditLabels: (ids: string[]) => void;
  onDuplicate?: (issue: TaskIssue) => void;
}

export function IssueCardView({
  issue,
  showProject,
  projects,
  visibleProperties,
}: {
  issue: TaskIssue;
  showProject: boolean;
  projects: TaskProject[];
  visibleProperties?: ReadonlySet<TaskVisibleProperty>;
}) {
  const project = projects.find((item) => item.id === issue.project);
  const show = (property: TaskVisibleProperty) =>
    !visibleProperties || visibleProperties.has(property);
  return (
    <>
      <span className="copper-task-card-meta">
        <span className="copper-task-id">{issue.id}</span>
        {show("priority") ? <TaskPriority value={issue.priority} /> : null}
      </span>
      <span className="copper-task-card-title">{issue.title}</span>
      {show("labels") ? <TaskLabels labels={issue.labels} /> : null}
      <span className="copper-task-card-footer">
        {showProject && show("project") && issue.project ? (
          <TaskProjectChip icon={project?.icon}>
            {project?.title ?? issue.project}
          </TaskProjectChip>
        ) : null}
        {show("due") ? <TaskDate value={issue.due} /> : null}
      </span>
    </>
  );
}

export function IssueBoardCard({
  issue,
  showProject,
  selected,
  actions,
}: {
  issue: TaskIssue;
  showProject: boolean;
  selected: boolean;
  actions: IssueBoardActions;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    animateLayoutChanges: boardCardAnimateLayoutChanges,
    data: { type: "issue", status: issue.status },
  });
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <IssueContextMenu
      issue={issue}
      targets={actions.selectedIssues}
      projects={actions.projects}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (open) actions.onContext(issue.id);
      }}
      onOpen={() => actions.onOpen(issue.id, "peek")}
      onOpenInNewTab={() => actions.onOpen(issue.id, "tab")}
      onUpdate={actions.onUpdate}
      onEditLabels={actions.onEditLabels}
      onDuplicate={actions.onDuplicate}
    >
      <button
        ref={setNodeRef}
        type="button"
        className="copper-task-card"
        data-issue-id={issue.id}
        data-selected={selected}
        data-menu-open={menuOpen || undefined}
        data-dragging={isDragging || undefined}
        style={{
          transform: isDragging ? undefined : CSS.Translate.toString(transform),
          transition: isDragging ? undefined : transition,
        }}
        {...attributes}
        {...listeners}
        onPointerDownCapture={(event) => {
          if (event.button !== 0) event.stopPropagation();
        }}
        onFocus={() => actions.onFocus(issue.id)}
        onClick={(event) => {
          if (event.shiftKey) actions.onRange(issue.id, actions.order);
          else
            actions.onOpen(
              issue.id,
              event.metaKey || event.ctrlKey ? "tab" : "peek",
            );
        }}
        onKeyDown={(event) => {
          if (event.key.toLowerCase() === "x") {
            event.preventDefault();
            event.stopPropagation();
            actions.onToggle(issue.id);
            return;
          }
          listeners?.onKeyDown?.(event);
        }}
      >
        <IssueCardView
          issue={issue}
          showProject={showProject}
          projects={actions.projects}
          visibleProperties={actions.visibleProperties}
        />
      </button>
    </IssueContextMenu>
  );
}
