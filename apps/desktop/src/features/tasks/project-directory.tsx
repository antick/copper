import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/features/tasks/constants";
import {
  type ProjectAction,
  ProjectContextMenu,
} from "@/features/tasks/project-context-menu";
import { ProjectIcon } from "@/features/tasks/project-icons";
import {
  formatTaskDate,
  summarizeProject,
} from "@/features/tasks/task-selectors";
import {
  TaskLabels,
  TaskProgress,
  TaskProjectStatus,
  TaskSelectMenu,
  TaskState,
} from "@/features/tasks/task-ui";
import type { ProjectStatus, TaskProject } from "@/lib/copper/tasks";

export function ProjectDirectory({
  projects,
  pending,
  error,
  onRetry,
  onOpen,
  onNew,
  onProjectAction,
}: {
  projects: TaskProject[];
  pending: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (id: string, mode?: "current" | "tab") => void;
  onNew: () => void;
  onProjectAction: (action: ProjectAction, project: TaskProject) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter(
      (project) =>
        (status === "all" || project.status === status) &&
        (!needle ||
          [project.title, ...project.labels]
            .join(" ")
            .toLowerCase()
            .includes(needle)),
    );
  }, [projects, query, status]);

  return (
    <section className="copper-task-content" aria-label="Projects directory">
      <header className="copper-task-content-header">
        <div>
          <span className="copper-task-eyebrow">Workspace</span>
          <h1>Projects</h1>
        </div>
        <button type="button" className="copper-task-primary" onClick={onNew}>
          <Plus size={14} aria-hidden />
          New project
        </button>
      </header>
      <div className="copper-task-directory-toolbar">
        <label className="copper-task-search">
          <Search size={14} aria-hidden />
          <input
            value={query}
            placeholder="Search projects…"
            aria-label="Search projects"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <TaskSelectMenu
          label="Project status filter"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            ...PROJECT_STATUSES.map((value) => ({
              value,
              label: PROJECT_STATUS_LABELS[value],
            })),
          ]}
        />
      </div>
      {pending ? (
        <TaskState kind="loading" title="Loading projects" />
      ) : error ? (
        <TaskState
          kind="error"
          title="Projects could not be loaded"
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
      ) : projects.length === 0 ? (
        <TaskState
          kind="empty"
          title="No projects yet"
          detail="Create a project to group related issues and track progress."
          action={
            <button
              type="button"
              className="copper-task-primary"
              onClick={onNew}
            >
              New project
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <TaskState
          kind="empty"
          title="No matching projects"
          detail="Try another search or status."
          action={
            <button
              type="button"
              className="copper-text-button"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="copper-scroll copper-task-project-grid">
          {visible.map((project) => {
            const summary = summarizeProject(project);
            return (
              <ProjectContextMenu
                key={project.id}
                project={project}
                onOpen={() => onOpen(project.id)}
                onOpenInNewTab={() => onOpen(project.id, "tab")}
                onAction={onProjectAction}
              >
                <button
                  type="button"
                  className="copper-task-project-card"
                  onClick={(event) =>
                    onOpen(
                      project.id,
                      event.metaKey || event.ctrlKey ? "tab" : "current",
                    )
                  }
                >
                  <span className="copper-task-project-card-title">
                    <ProjectIcon name={project.icon} size={16} />
                    {project.title}
                  </span>
                  <span className="copper-task-project-card-meta">
                    <TaskProjectStatus value={project.status} />
                    {project.target ? (
                      <span>Target {formatTaskDate(project.target)}</span>
                    ) : null}
                  </span>
                  <TaskLabels labels={project.labels} />
                  <TaskProgress
                    value={summary.progress}
                    label={`${summary.done} of ${summary.total} completed`}
                  />
                  <span className="copper-task-project-open">
                    {summary.open} open
                  </span>
                </button>
              </ProjectContextMenu>
            );
          })}
        </div>
      )}
    </section>
  );
}
