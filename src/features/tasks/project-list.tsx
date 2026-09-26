import { Inbox, Layers3, Pin, Plus } from "lucide-react";
import { TitleRegion } from "@/components/shell/title-region";
import { Tooltip } from "@/components/ui/tooltip";
import type { ProjectAction } from "@/features/tasks/project-context-menu";
import { ProjectNavList } from "@/features/tasks/project-nav-list";
import type { TasksDestination } from "@/lib/copper/settings";
import type { TaskProject } from "@/lib/copper/tasks";

export function ProjectList({
  projects,
  pinnedProjects,
  destination,
  selectedProject,
  onSelectDestination,
  onSelectProject,
  onNewProject,
  onProjectAction,
  onPinnedChange,
  onProjectReorder,
  onPinnedReorder,
  vaultName,
  platform,
  leftCollapsed,
  onToggleLeft,
}: {
  projects: TaskProject[];
  pinnedProjects: TaskProject[];
  destination: TasksDestination;
  selectedProject: string | null;
  onSelectDestination: (
    destination: TasksDestination,
    mode?: "current" | "tab",
  ) => void;
  onSelectProject: (id: string, mode?: "current" | "tab") => void;
  onNewProject: () => void;
  onProjectAction: (action: ProjectAction, project: TaskProject) => void;
  onPinnedChange: (id: string, pinned: boolean) => void;
  onProjectReorder: (fromId: string, toId: string) => void;
  onPinnedReorder: (fromId: string, toId: string) => void;
  vaultName?: string;
  platform?: string;
  leftCollapsed: boolean;
  onToggleLeft: () => void;
}) {
  return (
    <aside
      className="copper-pane copper-pane-left copper-pane-tasks-nav"
      aria-label="Tasks navigation"
    >
      <TitleRegion
        platform={platform}
        vaultName={vaultName}
        label="Tasks"
        leftCollapsed={leftCollapsed}
        onToggleLeft={onToggleLeft}
      />
      <div className="copper-scroll copper-task-navigation-body">
        <nav aria-label="Issue views">
          <ul className="copper-nav-list">
            <li>
              <button
                type="button"
                className="copper-nav-item"
                data-selected={destination === "all"}
                onClick={(event) =>
                  onSelectDestination(
                    "all",
                    event.metaKey || event.ctrlKey ? "tab" : "current",
                  )
                }
              >
                <Inbox size={14} strokeWidth={1.75} aria-hidden />
                All issues
              </button>
            </li>
          </ul>
        </nav>
        {pinnedProjects.length ? (
          <>
            <div className="copper-section-heading">
              <span className="copper-section-label">
                <Pin size={13} aria-hidden /> Pinned
              </span>
            </div>
            <ProjectNavList
              projects={pinnedProjects}
              selectedProject={
                destination === "project" ? selectedProject : null
              }
              pinnedIds={new Set(pinnedProjects.map(({ id }) => id))}
              onSelect={onSelectProject}
              onAction={onProjectAction}
              onPinnedChange={onPinnedChange}
              onReorder={onPinnedReorder}
            />
          </>
        ) : null}
        <div className="copper-section-heading">
          <button
            type="button"
            className="copper-section-label copper-task-projects-link"
            data-selected={destination === "projects"}
            onClick={(event) =>
              onSelectDestination(
                "projects",
                event.metaKey || event.ctrlKey ? "tab" : "current",
              )
            }
          >
            <Layers3 size={13} aria-hidden />
            Projects
          </button>
          <Tooltip content="New project">
            <button
              type="button"
              className="copper-section-add"
              aria-label="New project"
              onClick={onNewProject}
            >
              <Plus size={14} strokeWidth={1.75} />
            </button>
          </Tooltip>
        </div>
        <ProjectNavList
          projects={projects}
          selectedProject={destination === "project" ? selectedProject : null}
          pinnedIds={new Set(pinnedProjects.map(({ id }) => id))}
          onSelect={onSelectProject}
          onAction={onProjectAction}
          onPinnedChange={onPinnedChange}
          onReorder={onProjectReorder}
        />
      </div>
    </aside>
  );
}
