import { LayoutGrid, List, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/features/tasks/constants";
import { ProjectIcon } from "@/features/tasks/project-icons";
import { TaskDescriptionEditor } from "@/features/tasks/task-description-editor";
import {
  summarizeProject,
  taskBody,
  taskDescription,
} from "@/features/tasks/task-selectors";
import {
  TaskDatePopover,
  TaskMutationError,
  TaskProgress,
  TaskSelectMenu,
  TaskTextPopover,
} from "@/features/tasks/task-ui";
import type { TasksProjectView } from "@/lib/copper/settings";
import type { TaskProject, UpdateProjectInput } from "@/lib/copper/tasks";

const PROJECT_STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({
  value,
  label: PROJECT_STATUS_LABELS[value],
}));

export function ProjectWorkspace({
  project,
  view,
  onViewChange,
  onUpdate,
  onNewIssue,
  toolbar,
  children,
}: {
  project: TaskProject;
  view: TasksProjectView;
  onViewChange: (view: TasksProjectView) => void;
  onUpdate: (input: UpdateProjectInput) => Promise<unknown>;
  onNewIssue: () => void;
  toolbar?: ReactNode;
  children?: ReactNode;
}) {
  const summary = summarizeProject(project);
  const [title, setTitle] = useState(project.title);
  const [error, setError] = useState<string | null>(null);
  async function commit(input: UpdateProjectInput, throwOnError = false) {
    setError(null);
    try {
      await onUpdate(input);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The project could not be saved. Try again.",
      );
      if (throwOnError) throw cause;
    }
  }

  return (
    <section
      className="copper-task-content"
      aria-label={`${project.title} project`}
    >
      <header className="copper-task-content-header copper-task-project-header">
        <div className="copper-task-header-title">
          <ProjectIcon name={project.icon} size={18} />
          <h1>{project.title}</h1>
        </div>
        <nav className="copper-task-tabs" aria-label="Project views">
          {(["overview", "issues", "board"] as const).map((item) => (
            <button
              key={item}
              type="button"
              data-selected={view === item}
              onClick={() => onViewChange(item)}
            >
              {item === "issues" ? (
                <List size={14} aria-hidden />
              ) : item === "board" ? (
                <LayoutGrid size={14} aria-hidden />
              ) : null}
              {item[0]?.toUpperCase()}
              {item.slice(1)}
            </button>
          ))}
        </nav>
        {toolbar ? (
          <div className="copper-task-header-middle">{toolbar}</div>
        ) : (
          <span className="copper-task-header-middle" />
        )}
        <Tooltip content="New issue">
          <IconButton label="New issue" onClick={onNewIssue}>
            <Plus size={16} aria-hidden />
          </IconButton>
        </Tooltip>
      </header>
      {view === "overview" ? (
        <div className="copper-scroll copper-task-project-overview">
          <input
            className="copper-task-overview-title"
            aria-label="Project title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              if (title.trim() && title !== project.title)
                void commit({ title: title.trim() });
            }}
          />
          <div className="copper-task-property-row">
            <TaskSelectMenu
              label="Project status"
              value={project.status}
              options={PROJECT_STATUS_OPTIONS}
              onChange={(status) => void commit({ status })}
            />
            <TaskTextPopover
              label="Project labels"
              value={project.labels.join(", ")}
              placeholder="app, launch"
              onChange={(value) =>
                void commit({
                  labels: value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
            <TaskDatePopover
              label="Start date"
              value={project.start ?? ""}
              onChange={(start) => void commit({ start: start || null })}
            />
            <TaskDatePopover
              label="Target date"
              value={project.target ?? ""}
              onChange={(target) => void commit({ target: target || null })}
            />
          </div>
          <TaskMutationError message={error} />
          <TaskProgress
            value={summary.progress}
            label={`${summary.done} of ${summary.total} completed`}
          />
          <div className="copper-task-project-description">
            <TaskDescriptionEditor
              key={project.id}
              documentId={project.id}
              body={taskDescription(project.body)}
              ariaLabel="Project description"
              onSave={(body) =>
                commit(
                  { body: taskBody(title.trim() || project.title, body) },
                  true,
                )
              }
            />
          </div>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
