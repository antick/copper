import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProjectAction } from "@/features/tasks/project-context-menu";
import { ProjectContextMenu } from "@/features/tasks/project-context-menu";
import { ProjectIcon } from "@/features/tasks/project-icons";
import { summarizeProject } from "@/features/tasks/task-selectors";
import type { TaskProject } from "@/lib/copper/tasks";

function SortableProject({
  project,
  selected,
  pinned,
  onSelect,
  onAction,
  onPinnedChange,
}: {
  project: TaskProject;
  selected: boolean;
  pinned: boolean;
  onSelect: (mode?: "current" | "tab") => void;
  onAction: (action: ProjectAction, project: TaskProject) => void;
  onPinnedChange: (pinned: boolean) => void;
}) {
  const sortable = useSortable({ id: project.id });
  return (
    <li
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.5 : undefined,
      }}
    >
      <ProjectContextMenu
        project={project}
        onOpen={() => onSelect()}
        onOpenInNewTab={() => onSelect("tab")}
        onAction={onAction}
        pinned={pinned}
        onPinnedChange={onPinnedChange}
      >
        <button
          ref={sortable.setActivatorNodeRef}
          type="button"
          className="copper-nav-item copper-task-project-nav-item"
          data-selected={selected}
          {...sortable.attributes}
          {...sortable.listeners}
          onClick={(event) =>
            onSelect(event.metaKey || event.ctrlKey ? "tab" : "current")
          }
        >
          <ProjectIcon name={project.icon} />
          <span className="copper-task-nav-title">{project.title}</span>
          <span className="copper-nav-count">
            {summarizeProject(project).open}
          </span>
        </button>
      </ProjectContextMenu>
    </li>
  );
}

export function ProjectNavList({
  projects,
  selectedProject,
  pinnedIds,
  onSelect,
  onAction,
  onPinnedChange,
  onReorder,
}: {
  projects: TaskProject[];
  selectedProject: string | null;
  pinnedIds: ReadonlySet<string>;
  onSelect: (id: string, mode?: "current" | "tab") => void;
  onAction: (action: ProjectAction, project: TaskProject) => void;
  onPinnedChange: (id: string, pinned: boolean) => void;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function dragEnd(event: DragEndEvent) {
    const from = String(event.active.id);
    const to = event.over ? String(event.over.id) : from;
    if (from !== to) onReorder(from, to);
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={dragEnd}
    >
      <SortableContext
        items={projects.map(({ id }) => id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="copper-nav-list">
          {projects.map((project) => (
            <SortableProject
              key={project.id}
              project={project}
              selected={selectedProject === project.id}
              pinned={pinnedIds.has(project.id)}
              onSelect={(mode) => onSelect(project.id, mode)}
              onAction={onAction}
              onPinnedChange={(pinned) => onPinnedChange(project.id, pinned)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
