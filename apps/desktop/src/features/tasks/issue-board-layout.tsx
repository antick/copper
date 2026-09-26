import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GripVertical, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_KEYBOARD_SCROLL_STEP,
  BOARD_VIRTUALIZE_AFTER,
} from "@/features/tasks/constants";
import {
  type IssueBoardActions,
  IssueBoardCard,
  IssueCardView,
} from "@/features/tasks/issue-board-card";
import {
  boardCollisionDetection,
  boardDropSlot,
  boardKeyboardCoordinates,
  moveInputForDrop,
} from "@/features/tasks/issue-board-dnd";
import { BoardDropSlot } from "@/features/tasks/issue-board-drop-slot";
import { attachBoardHorizontalWheel } from "@/features/tasks/issue-board-scroll";
import { TASK_VISIBLE_PROPERTIES } from "@/features/tasks/task-selectors";
import {
  boardColumns,
  projectWorkflow,
  visibleStatusForProject,
} from "@/features/tasks/workflow";
import {
  WorkflowColumnMenu,
  WorkflowVisibilityMenu,
} from "@/features/tasks/workflow-column-menu";
import type {
  TaskIssue,
  TaskProject,
  TaskWorkflowColumn,
} from "@/lib/copper/tasks";

type IssueMoveInput = NonNullable<ReturnType<typeof moveInputForDrop>>;

function BoardColumn({
  column,
  issues,
  showProject,
  actions,
  dropSlot,
  active,
  onNewIssue,
  onRename,
  onMove,
  onHide,
  onArchive,
}: {
  column: TaskWorkflowColumn;
  issues: TaskIssue[];
  showProject: boolean;
  actions: IssueBoardActions;
  dropSlot: ReturnType<typeof boardDropSlot>;
  active: boolean;
  onNewIssue: () => void;
  onRename?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onHide?: () => void;
  onArchive?: () => void;
}) {
  const { setNodeRef: setDropRef } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "issue-lane", status: column.id },
  });
  const sortable = useSortable({
    id: `workflow:${column.id}`,
    disabled: !onMove,
    data: { type: "workflow-column", status: column.id },
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualize = issues.length > BOARD_VIRTUALIZE_AFTER;
  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 112,
    enabled: virtualize,
  });
  const cards = virtualize ? virtualizer.getVirtualItems() : [];
  return (
    <section
      ref={(node) => {
        setDropRef(node);
        sortable.setNodeRef(node);
      }}
      className="copper-task-column"
      data-drop-active={active || undefined}
      aria-label={column.label}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.45 : undefined,
      }}
    >
      <header className="copper-task-column-header">
        {onMove ? (
          <button
            type="button"
            className="copper-task-column-drag"
            aria-label={`Reorder ${column.label} column`}
            ref={sortable.setActivatorNodeRef}
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical size={14} aria-hidden />
          </button>
        ) : null}
        <span
          className="copper-task-column-dot"
          data-category={column.category}
        />
        <span>{column.label}</span>
        <span className="copper-nav-count">{issues.length}</span>
        <span className="copper-task-column-actions">
          <button
            type="button"
            className="copper-task-column-action"
            aria-label={`New ${column.label} issue`}
            onClick={onNewIssue}
          >
            <Plus size={14} aria-hidden />
          </button>
          <WorkflowColumnMenu
            column={column}
            onRename={onRename}
            onMove={onMove}
            onHide={onHide}
            onArchive={onArchive}
          />
        </span>
      </header>
      <div ref={scrollRef} className="copper-task-column-body">
        <div
          className="copper-task-column-cards"
          style={
            virtualize
              ? { height: virtualizer.getTotalSize(), position: "relative" }
              : undefined
          }
        >
          <SortableContext
            items={issues.map(({ id }) => id)}
            strategy={verticalListSortingStrategy}
          >
            {(virtualize ? cards : issues).map((item) => {
              const issue = "index" in item ? issues[item.index] : item;
              if (!issue) return null;
              const card = (
                <IssueBoardCard
                  key={issue.id}
                  issue={issue}
                  showProject={showProject}
                  selected={actions.selectedIds.has(issue.id)}
                  actions={actions}
                />
              );
              return "index" in item ? (
                <div
                  key={issue.id}
                  className="copper-task-virtual-card"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  {card}
                </div>
              ) : (
                card
              );
            })}
          </SortableContext>
          {issues.length === 0 && !dropSlot ? (
            <span className="copper-task-column-empty">Drop issues here</span>
          ) : null}
          {dropSlot ? (
            <BoardDropSlot
              beforeId={dropSlot.beforeId}
              afterId={dropSlot.afterId}
              empty={issues.length === 0}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function IssueBoard({
  issues,
  project,
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
  visibleProperties,
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
  issues: TaskIssue[];
  project: string | null;
  projects: TaskProject[];
  selectedIds: ReadonlySet<string>;
  onOpen: IssueBoardActions["onOpen"];
  onFocus: IssueBoardActions["onFocus"];
  onToggle: IssueBoardActions["onToggle"];
  onRange: IssueBoardActions["onRange"];
  onContext: IssueBoardActions["onContext"];
  onUpdate: IssueBoardActions["onUpdate"];
  onEditLabels: IssueBoardActions["onEditLabels"];
  onDuplicate?: IssueBoardActions["onDuplicate"];
  visibleProperties?: IssueBoardActions["visibleProperties"];
  onMove: (id: string, input: IssueMoveInput) => void;
  onMoveRejected?: (message: string) => void;
  onNewIssue?: (status: string) => void;
  onAddColumn?: () => void;
  onRenameColumn?: (column: TaskWorkflowColumn) => void;
  onMoveColumn?: (column: TaskWorkflowColumn, direction: -1 | 1) => void;
  onReorderColumn?: (fromId: string, toId: string) => void;
  onHideColumn?: (column: TaskWorkflowColumn) => void;
  onShowColumn?: (column: TaskWorkflowColumn) => void;
  onArchiveColumn?: (column: TaskWorkflowColumn) => void;
}) {
  const scoped = useMemo(
    () => issues.filter((issue) => !project || issue.project === project),
    [issues, project],
  );
  const columns = useMemo(
    () => boardColumns(scoped, projects, project),
    [project, projects, scoped],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: boardKeyboardCoordinates }),
  );
  const activeIssue = scoped.find((issue) => issue.id === activeId);
  const selectedProject = projects.find((item) => item.id === project);
  const hiddenColumns = projectWorkflow(selectedProject).filter(
    (column) => column.hidden,
  );
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    return attachBoardHorizontalWheel(board);
  }, []);
  const dropSlot = boardDropSlot(scoped, activeId, overId);
  const actions: IssueBoardActions = {
    selectedIds,
    selectedIssues: scoped.filter((issue) => selectedIds.has(issue.id)),
    order: scoped.map((issue) => issue.id),
    projects,
    visibleProperties: visibleProperties ?? new Set(TASK_VISIBLE_PROPERTIES),
    onOpen,
    onFocus,
    onToggle,
    onRange,
    onContext,
    onUpdate,
    onEditLabels,
    onDuplicate,
  };

  function statusForOver(over: string) {
    if (over.startsWith("column:")) return over.slice(7);
    if (over.startsWith("workflow:")) return over.slice(9);
    return scoped.find((issue) => issue.id === over)?.status ?? null;
  }
  function finishDrag() {
    setActiveId(null);
    setOverId(null);
    setOverStatus(null);
  }
  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const over = event.over ? String(event.over.id) : null;
    if (!over) return finishDrag();
    if (id.startsWith("workflow:")) {
      const target = statusForOver(over);
      if (target) onReorderColumn?.(id.slice(9), target);
      return finishDrag();
    }
    const input = moveInputForDrop(scoped, id, over);
    const issue = scoped.find((item) => item.id === id);
    const owner = projects.find((item) => item.id === issue?.project);
    if (input && !visibleStatusForProject(input.status, owner)) {
      onMoveRejected?.(
        `${owner?.title ?? "This issue"} does not use that column.`,
      );
      return finishDrag();
    }
    if (input) onMove(id, input);
    finishDrag();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollisionDetection}
      autoScroll
      onDragStart={(event: DragStartEvent) => {
        const id = String(event.active.id);
        setActiveId(id);
        setOverStatus(
          id.startsWith("workflow:")
            ? null
            : (scoped.find((issue) => issue.id === id)?.status ?? null),
        );
      }}
      onDragOver={(event: DragOverEvent) => {
        if (String(event.active.id).startsWith("workflow:")) return;
        setOverId(event.over ? String(event.over.id) : null);
        setOverStatus(event.over ? statusForOver(String(event.over.id)) : null);
      }}
      onDragCancel={finishDrag}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up issue ${active.id}.`,
          onDragOver: ({ over }) =>
            over ? `Issue is over ${over.id}.` : "Issue has no drop target.",
          onDragEnd: ({ active, over }) =>
            over
              ? `Dropped issue ${active.id} on ${over.id}.`
              : `Move canceled for ${active.id}.`,
          onDragCancel: ({ active }) => `Move canceled for ${active.id}.`,
        },
      }}
    >
      <div
        ref={boardRef}
        className="copper-task-board"
        role="region"
        aria-label="Kanban board"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the scroll region needs direct keyboard access.
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.currentTarget.scrollLeft +=
              event.key === "ArrowLeft"
                ? -BOARD_KEYBOARD_SCROLL_STEP
                : BOARD_KEYBOARD_SCROLL_STEP;
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            event.currentTarget.scrollLeft =
              event.key === "Home" ? 0 : event.currentTarget.scrollWidth;
          }
        }}
      >
        <div className="copper-task-board-track">
          <SortableContext
            items={columns.map((column) => `workflow:${column.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                issues={scoped.filter((issue) => issue.status === column.id)}
                showProject={!project}
                actions={actions}
                dropSlot={dropSlot?.status === column.id ? dropSlot : null}
                active={overStatus === column.id}
                onNewIssue={() => onNewIssue?.(column.id)}
                onRename={
                  onRenameColumn ? () => onRenameColumn(column) : undefined
                }
                onMove={
                  onMoveColumn
                    ? (direction) => onMoveColumn(column, direction)
                    : undefined
                }
                onHide={onHideColumn ? () => onHideColumn(column) : undefined}
                onArchive={
                  onArchiveColumn ? () => onArchiveColumn(column) : undefined
                }
              />
            ))}
          </SortableContext>
          {project &&
          (onAddColumn || (onShowColumn && hiddenColumns.length)) ? (
            <div className="copper-task-board-actions">
              {onAddColumn ? (
                <button
                  type="button"
                  className="copper-task-board-action"
                  onClick={onAddColumn}
                >
                  <Plus size={15} aria-hidden /> Add column
                </button>
              ) : null}
              {onShowColumn ? (
                <WorkflowVisibilityMenu
                  columns={hiddenColumns}
                  onShow={onShowColumn}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <div className="copper-task-card-overlay-lift">
            <div className="copper-task-card copper-task-card-overlay">
              <IssueCardView
                issue={activeIssue}
                showProject={!project}
                projects={projects}
                visibleProperties={actions.visibleProperties}
              />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
