import { LayoutGrid, List } from "lucide-react";
import type { Dispatch, ReactNode, RefObject } from "react";
import { PaneResizer } from "@/components/ui/pane-resizer";
import type {
  IssueFilter,
  IssueGroupBy,
  IssueSort,
} from "@/features/tasks/filter-issues";
import type { ProjectAction } from "@/features/tasks/project-context-menu";
import { ProjectList } from "@/features/tasks/project-list";
import { reorderProjectIds } from "@/features/tasks/task-project-navigation";
import type { TaskVisibleProperty } from "@/features/tasks/task-selectors";
import type { TaskTabsAction, TaskTabsState } from "@/features/tasks/task-tabs";
import { TaskToolbar } from "@/features/tasks/task-toolbar";
import { TaskTopBar } from "@/features/tasks/task-top-bar";
import type { TasksDestination, TasksView } from "@/lib/copper/settings";
import type { TaskIssue, TaskProject } from "@/lib/copper/tasks";
import { isMacPlatform } from "@/lib/platform";

export function TaskIssueToolbar({
  searchRef,
  query,
  filter,
  groupBy,
  sort,
  visibleProperties,
  view,
  onQueryChange,
  onFilterChange,
  onGroupByChange,
  onSortChange,
  onToggleProperty,
  onViewChange,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  filter: IssueFilter;
  groupBy: IssueGroupBy;
  sort: IssueSort;
  visibleProperties: ReadonlySet<TaskVisibleProperty>;
  view: TasksView;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: IssueFilter) => void;
  onGroupByChange: (value: IssueGroupBy) => void;
  onSortChange: (value: IssueSort) => void;
  onToggleProperty: (value: TaskVisibleProperty) => void;
  onViewChange: (view: TasksView) => void;
}) {
  return (
    <TaskToolbar
      ref={searchRef}
      query={query}
      onQueryChange={onQueryChange}
      filter={filter}
      onFilterChange={onFilterChange}
      groupBy={groupBy}
      onGroupByChange={onGroupByChange}
      sort={sort}
      onSortChange={onSortChange}
      visibleProperties={visibleProperties}
      onToggleProperty={onToggleProperty}
    >
      <button
        type="button"
        className="copper-icon-button"
        aria-label={view === "board" ? "Show list" : "Show board"}
        onClick={() => onViewChange(view === "board" ? "list" : "board")}
      >
        {view === "board" ? (
          <List size={15} aria-hidden />
        ) : (
          <LayoutGrid size={15} aria-hidden />
        )}
      </button>
    </TaskToolbar>
  );
}

export function TaskWorkspaceFrame({
  children,
  projects,
  issues,
  destination,
  selectedProject,
  vaultName,
  platform,
  leftCollapsed,
  tabsState,
  onTabsAction,
  onToggleLeft,
  onSelectDestination,
  onSelectProject,
  onNewProject,
  onProjectAction,
  pinnedProjects,
  projectOrder,
  onPinnedProjectsChange,
  onProjectOrderChange,
}: {
  children: ReactNode;
  projects: TaskProject[];
  issues: TaskIssue[];
  destination: TasksDestination;
  selectedProject: string | null;
  vaultName: string;
  platform?: string;
  leftCollapsed: boolean;
  tabsState: TaskTabsState;
  onTabsAction: Dispatch<TaskTabsAction>;
  onToggleLeft: () => void;
  onSelectDestination: (destination: TasksDestination) => void;
  onSelectProject: (project: string) => void;
  onNewProject: () => void;
  onProjectAction: (action: ProjectAction, project: TaskProject) => void;
  pinnedProjects: string[];
  projectOrder: string[];
  onPinnedProjectsChange: (ids: string[]) => void;
  onProjectOrderChange: (ids: string[]) => void;
}) {
  return (
    <div className="copper-panes copper-panes-tasks">
      {!leftCollapsed ? (
        <>
          <ProjectList
            projects={projects}
            pinnedProjects={pinnedProjects
              .map((id) => projects.find((project) => project.id === id))
              .filter((project): project is TaskProject => Boolean(project))}
            destination={destination}
            selectedProject={selectedProject}
            vaultName={vaultName}
            platform={platform}
            leftCollapsed={false}
            onToggleLeft={onToggleLeft}
            onSelectDestination={onSelectDestination}
            onSelectProject={onSelectProject}
            onNewProject={onNewProject}
            onProjectAction={onProjectAction}
            onPinnedChange={(id, pinned) =>
              onPinnedProjectsChange(
                pinned
                  ? [...pinnedProjects, id]
                  : pinnedProjects.filter((item) => item !== id),
              )
            }
            onProjectReorder={(fromId, toId) =>
              onProjectOrderChange(
                reorderProjectIds(projectOrder, fromId, toId),
              )
            }
            onPinnedReorder={(fromId, toId) =>
              onPinnedProjectsChange(
                reorderProjectIds(pinnedProjects, fromId, toId),
              )
            }
          />
          <PaneResizer
            cssVar="--tasks-nav-width"
            min={190}
            max={320}
            lineBelowHeader={isMacPlatform(platform)}
          />
        </>
      ) : null}
      <div className="copper-task-main">
        <TaskTopBar
          state={tabsState}
          dispatch={onTabsAction}
          issues={issues}
          projects={projects}
          leftCollapsed={leftCollapsed}
          onRestoreSidebar={onToggleLeft}
        />
        {children}
      </div>
    </div>
  );
}
