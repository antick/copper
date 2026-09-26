import { type Dispatch, useEffect, useMemo, useReducer, useState } from "react";
import { matchesIssueSearch, sortIssues } from "@/features/tasks/filter-issues";
import { useIssueBulkUpdate } from "@/features/tasks/issue-bulk-update";
import {
  emptyIssueSelection,
  issueSelectionReducer,
} from "@/features/tasks/issue-selection";
import { IssueSurface } from "@/features/tasks/issue-surface";
import { IssueView } from "@/features/tasks/issue-view";
import { ProjectDirectory } from "@/features/tasks/project-directory";
import { ProjectWorkspace } from "@/features/tasks/project-workspace";
import {
  useCreateIssue,
  useCreateProject,
  useMoveIssue,
  useTaskIssue,
  useTaskIssues,
  useTaskProject,
  useTaskProjects,
  useUpdateIssue,
  useUpdateProject,
} from "@/features/tasks/queries";
import {
  TaskManagementDialogs,
  useTaskManagement,
} from "@/features/tasks/task-management";
import { TaskOverlays } from "@/features/tasks/task-overlays";
import {
  normalizeProjectNavigation,
  sameIds,
} from "@/features/tasks/task-project-navigation";
import {
  duplicateIssueInput,
  effectiveTaskView,
  issuesForDestination,
  taskSurfaceTitle,
} from "@/features/tasks/task-selectors";
import {
  resolveTaskTarget,
  type TaskTabsAction,
  type TaskTabsState,
} from "@/features/tasks/task-tabs";
import { TaskState } from "@/features/tasks/task-ui";
import { TaskWorkspaceFrame } from "@/features/tasks/task-workspace-chrome";
import { TaskWorkspaceIssueToolbar } from "@/features/tasks/task-workspace-issue-toolbar";
import {
  useTaskTargetValidation,
  useTaskWorkspaceShortcuts,
} from "@/features/tasks/task-workspace-shortcuts";
import {
  useIssuePeek,
  useTaskComposer,
  useTaskNavigation,
} from "@/features/tasks/task-workspace-state";
import { useIssueCommentActions } from "@/features/tasks/use-issue-comment-actions";
import { useTaskIssueControls } from "@/features/tasks/use-task-issue-controls";
import {
  activeProjects,
  isBaseBoardStatus,
  projectWorkflow,
} from "@/features/tasks/workflow";
import type { IssueColumnId } from "@/lib/copper/task-settings";
import type { CreateIssueInput, CreateProjectInput } from "@/lib/copper/tasks";

export function TasksWorkspace({
  vaultId,
  vaultName = "Vault",
  platform,
  leftCollapsed = false,
  onToggleLeft,
  tabsState,
  onTabsAction,
  projectOrder = [],
  pinnedProjects = [],
  listColumnWidths = {},
  onProjectOrderChange = ignoreIds,
  onPinnedProjectsChange = ignoreIds,
  onListColumnWidthsChange = ignoreWidths,
}: {
  vaultId: string;
  vaultName?: string;
  platform?: string;
  leftCollapsed?: boolean;
  onToggleLeft?: () => void;
  tabsState: TaskTabsState;
  onTabsAction: Dispatch<TaskTabsAction>;
  projectOrder?: string[];
  pinnedProjects?: string[];
  listColumnWidths?: Partial<Record<IssueColumnId, number>>;
  onProjectOrderChange?: (ids: string[]) => void;
  onPinnedProjectsChange?: (ids: string[]) => void;
  onListColumnWidthsChange?: (
    widths: Partial<Record<IssueColumnId, number>>,
  ) => void;
}) {
  const activeTab =
    tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId) ??
    tabsState.tabs[0];
  const target = activeTab.target;
  const {
    destination,
    project,
    projectView,
    view,
    issue: issueTabId,
  } = resolveTaskTarget(target);
  const [selection, dispatchSelection] = useReducer(
    issueSelectionReducer,
    emptyIssueSelection,
  );
  const selectedIds = new Set(selection.ids);
  const {
    peekIssueId,
    selectedIssueId,
    openIssue,
    openIssueTab,
    handleOpenIssue,
    closeIssue,
  } = useIssuePeek(issueTabId, onTabsAction, (id) =>
    dispatchSelection({ type: "focus", id }),
  );
  const issuesQuery = useTaskIssues(vaultId);
  const projectsQuery = useTaskProjects(vaultId);
  const issueQuery = useTaskIssue(vaultId, selectedIssueId);
  const projectQuery = useTaskProject(
    vaultId,
    destination === "project" ? project : null,
  );
  const updateIssue = useUpdateIssue(vaultId);
  const commentActions = useIssueCommentActions(vaultId);
  const { failure: bulkFailure, updateIssues } = useIssueBulkUpdate(
    (id, input) => updateIssue.mutateAsync({ id, input }),
  );
  const updateProject = useUpdateProject(vaultId);
  const moveIssue = useMoveIssue(vaultId);
  const createIssue = useCreateIssue(vaultId);
  const createProject = useCreateProject(vaultId);
  const { composer, openComposer, closeComposer, takeFocus } =
    useTaskComposer();
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const controls = useTaskIssueControls(issuesQuery.data ?? [], updateIssues);
  const {
    filter,
    setFilter,
    groupBy,
    sort,
    query,
    searchInput,
    setSearchInput,
    visibleProperties,
    searchRef,
    editLabels,
  } = controls;

  const issues = issuesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const projectNavigation = useMemo(
    () =>
      normalizeProjectNavigation(
        activeProjects(projects),
        projectOrder,
        pinnedProjects,
      ),
    [pinnedProjects, projectOrder, projects],
  );
  const visibleProjects = projectNavigation.projects;
  useEffect(() => {
    if (projectsQuery.isPending) return;
    if (!sameIds(projectOrder, projectNavigation.projectOrder))
      onProjectOrderChange(projectNavigation.projectOrder);
    if (!sameIds(pinnedProjects, projectNavigation.pinnedProjects))
      onPinnedProjectsChange(projectNavigation.pinnedProjects);
  }, [
    onPinnedProjectsChange,
    onProjectOrderChange,
    pinnedProjects,
    projectNavigation,
    projectOrder,
    projectsQuery.isPending,
  ]);
  useTaskTargetValidation({
    target,
    issues,
    projects: visibleProjects,
    pending: issuesQuery.isPending || projectsQuery.isPending,
    dispatch: onTabsAction,
  });
  const destinationIssues = useMemo(
    () => issuesForDestination(issues, destination, projects),
    [destination, issues, projects],
  );
  const scopedIssues = useMemo(
    () =>
      destination === "project" && project
        ? destinationIssues.filter((issue) => issue.project === project)
        : destinationIssues,
    [destination, destinationIssues, project],
  );
  const selectedProject =
    projectQuery.data && !projectQuery.data.archived
      ? projectQuery.data
      : visibleProjects.find((item) => item.id === project);
  const navigableIssues = useMemo(
    () =>
      sortIssues(
        scopedIssues.filter((issue) => matchesIssueSearch(issue, query)),
        sort,
      ),
    [query, scopedIssues, sort],
  );
  const effectiveView = effectiveTaskView(destination, projectView, view);
  const { selectDestination, selectProject, navigateView } = useTaskNavigation({
    destination,
    project,
    view,
    onTabsAction,
    onNavigate: closeIssue,
  });
  const management = useTaskManagement({
    vaultId,
    activeProjectId: destination === "project" ? project : null,
    onTabsAction,
  });

  useTaskWorkspaceShortcuts({
    issues,
    navigableIssues,
    selectedIssueId,
    selectedCount: selection.ids.length,
    focusedId: selection.focusedId,
    composerOpen: composer !== null,
    view,
    searchRef,
    onOpenComposer: openComposer,
    onCloseComposer: closeComposer,
    onCloseIssue: closeIssue,
    onOpenIssue: openIssue,
    onNavigateView: navigateView,
    onUpdateIssue: (id, input) => void updateIssue.mutateAsync({ id, input }),
    onClearSelection: () => dispatchSelection({ type: "clear" }),
    onToggleSelection: (id) => dispatchSelection({ type: "toggle", id }),
  });

  async function submitIssue(input: CreateIssueInput) {
    const created = await createIssue.mutateAsync(input);
    takeFocus()?.focus();
    openIssue(created.id);
  }
  async function submitProject(input: CreateProjectInput) {
    const created = await createProject.mutateAsync(input);
    onTabsAction({
      type: "navigate",
      target: { kind: "project", project: created.id, view: "overview" },
    });
  }
  const issueToolbar = (
    <TaskWorkspaceIssueToolbar
      controls={controls}
      view={effectiveView}
      onViewChange={navigateView}
    />
  );
  const issueSurface = (
    <IssueSurface
      title={taskSurfaceTitle(destination, selectedProject?.title)}
      showHeader={destination !== "project"}
      view={effectiveView}
      issues={scopedIssues}
      projects={projects}
      project={destination === "project" ? project : null}
      pending={issuesQuery.isPending}
      error={issuesQuery.isError}
      mutationError={
        bulkFailure
          ? new Error(
              `${bulkFailure.ids.length} issue${bulkFailure.ids.length === 1 ? "" : "s"} could not be updated.`,
            )
          : (moveIssue.error ??
            (workspaceError ? new Error(workspaceError) : null) ??
            (!management.projectAction &&
            !management.workflowAction &&
            management.error
              ? new Error(management.error)
              : null))
      }
      onRetryMutation={() => {
        if (bulkFailure) void updateIssues(bulkFailure.ids, bulkFailure.input);
        else if (moveIssue.variables) moveIssue.mutate(moveIssue.variables);
      }}
      toolbar={destination === "project" ? undefined : issueToolbar}
      filter={filter}
      groupBy={groupBy}
      sort={sort}
      query={searchInput}
      visibleProperties={visibleProperties}
      selectedIds={selectedIds}
      onRetry={() => void issuesQuery.refetch()}
      onSearch={setSearchInput}
      onFilter={setFilter}
      onOpenIssue={handleOpenIssue}
      onFocusIssue={(id) => dispatchSelection({ type: "focus", id })}
      onToggleIssue={(id) => dispatchSelection({ type: "toggle", id })}
      onRangeIssue={(id, order) =>
        dispatchSelection({ type: "range", id, order })
      }
      onContextIssue={(id) => dispatchSelection({ type: "context", id })}
      onUpdateIssues={(ids, input) => void updateIssues(ids, input)}
      onEditLabels={editLabels}
      onDuplicate={(issue) => {
        void createIssue.mutateAsync(duplicateIssueInput(issue));
      }}
      columnWidths={listColumnWidths}
      onColumnWidthsChange={onListColumnWidthsChange}
      onMove={(id, input) => moveIssue.mutate({ id, input })}
      onMoveRejected={setWorkspaceError}
      onNewIssue={(status) => {
        setWorkspaceError(null);
        const owner =
          status && !isBaseBoardStatus(status)
            ? visibleProjects.find((item) =>
                projectWorkflow(item).some((column) => column.id === status),
              )
            : undefined;
        openComposer("issue", {
          project: destination === "project" ? project : (owner?.id ?? null),
          status: status ?? "todo",
        });
      }}
      onAddColumn={
        selectedProject
          ? () => management.openWorkflowAction("add", selectedProject)
          : undefined
      }
      onRenameColumn={
        selectedProject
          ? (column) =>
              management.openWorkflowAction("rename", selectedProject, column)
          : undefined
      }
      onMoveColumn={
        selectedProject
          ? (column, direction) =>
              void management.moveColumn(selectedProject, column, direction)
          : undefined
      }
      onReorderColumn={
        selectedProject
          ? (fromId, toId) =>
              void management.reorderColumn(selectedProject, fromId, toId)
          : undefined
      }
      onHideColumn={
        selectedProject
          ? (column) =>
              void management.setColumnHidden(selectedProject, column, true)
          : undefined
      }
      onShowColumn={
        selectedProject
          ? (column) =>
              void management.setColumnHidden(selectedProject, column, false)
          : undefined
      }
      onArchiveColumn={
        selectedProject
          ? (column) =>
              management.openWorkflowAction("archive", selectedProject, column)
          : undefined
      }
    />
  );

  return (
    <TaskWorkspaceFrame
      projects={visibleProjects}
      issues={issues}
      destination={destination}
      selectedProject={project}
      vaultName={vaultName}
      platform={platform}
      leftCollapsed={leftCollapsed}
      tabsState={tabsState}
      onTabsAction={onTabsAction}
      onToggleLeft={() => onToggleLeft?.()}
      onSelectDestination={selectDestination}
      onSelectProject={selectProject}
      onNewProject={() => openComposer("project")}
      onProjectAction={management.openProjectAction}
      projectOrder={projectNavigation.projectOrder}
      pinnedProjects={projectNavigation.pinnedProjects}
      onProjectOrderChange={onProjectOrderChange}
      onPinnedProjectsChange={onPinnedProjectsChange}
    >
      {issueTabId ? (
        issueQuery.data ? (
          <IssueView
            issue={issueQuery.data}
            projects={projects}
            variant="tab"
            onClose={() =>
              onTabsAction({ type: "close", id: tabsState.activeTabId })
            }
            onUpdate={(input) =>
              updateIssue.mutateAsync({ id: issueTabId, input })
            }
            commentActions={commentActions(issueTabId)}
          />
        ) : issueQuery.isError ? (
          <TaskState
            kind="error"
            title="Issue could not be loaded"
            action={
              <button type="button" onClick={() => void issueQuery.refetch()}>
                Retry
              </button>
            }
          />
        ) : (
          <TaskState kind="loading" title="Loading issue" />
        )
      ) : destination === "projects" ? (
        <ProjectDirectory
          projects={visibleProjects}
          pending={projectsQuery.isPending}
          error={projectsQuery.isError}
          onRetry={() => void projectsQuery.refetch()}
          onOpen={selectProject}
          onNew={() => openComposer("project")}
          onProjectAction={management.openProjectAction}
        />
      ) : destination === "project" ? (
        selectedProject ? (
          <ProjectWorkspace
            key={selectedProject.id}
            project={selectedProject}
            view={projectView}
            onViewChange={(next) =>
              onTabsAction({
                type: "navigate",
                target: {
                  kind: "project",
                  project: selectedProject.id,
                  view: next,
                },
              })
            }
            onUpdate={(input) =>
              updateProject.mutateAsync({ id: selectedProject.id, input })
            }
            onNewIssue={() =>
              openComposer("issue", {
                project: selectedProject.id,
                status: "todo",
              })
            }
            toolbar={projectView === "overview" ? undefined : issueToolbar}
          >
            {issueSurface}
          </ProjectWorkspace>
        ) : projectQuery.isError ? (
          <TaskState
            kind="error"
            title="Project could not be loaded"
            action={
              <button type="button" onClick={() => void projectQuery.refetch()}>
                Retry
              </button>
            }
          />
        ) : (
          <TaskState kind="loading" title="Loading project" />
        )
      ) : (
        issueSurface
      )}
      <TaskOverlays
        issue={peekIssueId ? issueQuery.data : undefined}
        projects={projects}
        composer={composer?.kind ?? null}
        defaultProject={composer?.project ?? null}
        defaultStatus={composer?.status ?? "todo"}
        onCloseIssue={closeIssue}
        onOpenIssueTab={() => peekIssueId && openIssueTab(peekIssueId)}
        onUpdateIssue={(input) =>
          peekIssueId
            ? updateIssue.mutateAsync({ id: peekIssueId, input })
            : Promise.resolve()
        }
        commentActions={commentActions(peekIssueId)}
        onCloseComposer={closeComposer}
        onSubmitIssue={submitIssue}
        onSubmitProject={submitProject}
      />
      <TaskManagementDialogs management={management} issues={issues} />
    </TaskWorkspaceFrame>
  );
}

function ignoreIds(_ids: string[]) {}
function ignoreWidths(_widths: Partial<Record<IssueColumnId, number>>) {}
