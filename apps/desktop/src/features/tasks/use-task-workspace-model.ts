import { useEffect, useMemo } from "react";
import {
  type IssueSort,
  matchesIssueSearch,
  sortIssues,
} from "@/features/tasks/filter-issues";
import {
  normalizeProjectNavigation,
  sameIds,
} from "@/features/tasks/task-project-navigation";
import {
  effectiveTaskView,
  issuesForDestination,
} from "@/features/tasks/task-selectors";
import { activeProjects } from "@/features/tasks/workflow";
import type {
  TasksDestination,
  TasksProjectView,
  TasksView,
} from "@/lib/copper/settings";
import type { TaskIssue, TaskProject } from "@/lib/copper/tasks";

export function useTaskWorkspaceModel({
  issues,
  projects,
  project,
  projectData,
  destination,
  projectView,
  view,
  query,
  sort,
  projectOrder,
  pinnedProjects,
  projectsPending,
  onProjectOrderChange,
  onPinnedProjectsChange,
}: {
  issues: TaskIssue[];
  projects: TaskProject[];
  project: string | null;
  projectData?: TaskProject;
  destination: TasksDestination;
  projectView: TasksProjectView;
  view: TasksView;
  query: string;
  sort: IssueSort;
  projectOrder: string[];
  pinnedProjects: string[];
  projectsPending: boolean;
  onProjectOrderChange: (ids: string[]) => void;
  onPinnedProjectsChange: (ids: string[]) => void;
}) {
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
    if (projectsPending) return;
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
    projectsPending,
  ]);

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
    projectData && !projectData.archived
      ? projectData
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

  return {
    issues,
    projects,
    projectNavigation,
    visibleProjects,
    scopedIssues,
    selectedProject,
    navigableIssues,
    effectiveView,
  };
}
