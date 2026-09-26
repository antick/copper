import { type Dispatch, useState } from "react";
import { ProjectActionDialog } from "@/features/tasks/project-action-dialog";
import type { ProjectAction } from "@/features/tasks/project-context-menu";
import {
  useArchiveProject,
  useDeleteProject,
  useUpdateProject,
  useUpdateProjectWorkflow,
} from "@/features/tasks/queries";
import type { TaskTabsAction } from "@/features/tasks/task-tabs";
import { customWorkflowId, projectWorkflow } from "@/features/tasks/workflow";
import {
  type WorkflowAction,
  WorkflowDialog,
} from "@/features/tasks/workflow-dialog";
import type {
  TaskIssue,
  TaskProject,
  TaskWorkflowColumn,
  WorkflowCategory,
} from "@/lib/copper/tasks";

interface ProjectActionState {
  action: ProjectAction;
  project: TaskProject;
}

interface WorkflowActionState {
  action: WorkflowAction;
  project: TaskProject;
  column?: TaskWorkflowColumn;
}

function insertColumn(
  workflow: TaskWorkflowColumn[],
  column: TaskWorkflowColumn,
) {
  const before =
    column.category === "unstarted"
      ? "in_progress"
      : column.category === "started"
        ? "done"
        : "canceled";
  const index = workflow.findIndex((item) => item.id === before);
  const next = [...workflow];
  next.splice(index < 0 ? next.length : index, 0, column);
  return next;
}

export function useTaskManagement({
  vaultId,
  activeProjectId,
  onTabsAction,
}: {
  vaultId: string;
  activeProjectId: string | null;
  onTabsAction: Dispatch<TaskTabsAction>;
}) {
  const updateProject = useUpdateProject(vaultId);
  const updateWorkflow = useUpdateProjectWorkflow(vaultId);
  const archiveProject = useArchiveProject(vaultId);
  const deleteProject = useDeleteProject(vaultId);
  const [projectAction, setProjectAction] = useState<ProjectActionState | null>(
    null,
  );
  const [workflowAction, setWorkflowAction] =
    useState<WorkflowActionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const replaceDeletedTarget = (id: string) => {
    if (activeProjectId === id) {
      onTabsAction({
        type: "replace",
        target: { kind: "destination", destination: "all", view: "board" },
      });
    }
  };

  async function submitProjectAction(value?: string) {
    if (!projectAction) return;
    const { action, project } = projectAction;
    setError(null);
    try {
      if (action === "rename") {
        await updateProject.mutateAsync({
          id: project.id,
          input: { title: value },
        });
      } else if (action === "icon") {
        await updateProject.mutateAsync({
          id: project.id,
          input: { icon: value },
        });
      } else if (action === "archive") {
        await archiveProject.mutateAsync(project.id);
        replaceDeletedTarget(project.id);
      } else {
        await deleteProject.mutateAsync(project.id);
        replaceDeletedTarget(project.id);
      }
      setProjectAction(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Project update failed.",
      );
    }
  }

  async function submitWorkflowAction(value: {
    label: string;
    category: WorkflowCategory;
    fallbackStatusId?: string;
  }) {
    if (!workflowAction) return;
    const { action, project, column } = workflowAction;
    const current = projectWorkflow(project);
    let workflow = current;
    if (action === "add") {
      const next: TaskWorkflowColumn = {
        id: customWorkflowId(project.id, value.label),
        label: value.label,
        category: value.category,
      };
      if (current.some((item) => item.id === next.id)) {
        setError("A column with that name already exists.");
        return;
      }
      workflow = insertColumn(current, next);
    } else if (action === "rename" && column) {
      workflow = current.map((item) =>
        item.id === column.id
          ? { ...item, label: value.label, category: value.category }
          : item,
      );
    } else if (action === "archive" && column) {
      workflow = current.filter((item) => item.id !== column.id);
    }
    setError(null);
    try {
      await updateWorkflow.mutateAsync({
        id: project.id,
        input: {
          workflow,
          archivedStatusId: action === "archive" ? column?.id : undefined,
          fallbackStatusId: value.fallbackStatusId,
        },
      });
      setWorkflowAction(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Workflow update failed.",
      );
    }
  }

  async function moveColumn(
    project: TaskProject,
    column: TaskWorkflowColumn,
    direction: -1 | 1,
  ) {
    const visible = projectWorkflow(project).filter((item) => !item.hidden);
    const from = visible.findIndex((item) => item.id === column.id);
    const target = visible[from + direction];
    if (from < 0 || !target) return;
    await reorderColumn(project, column.id, target.id);
  }

  async function setColumnHidden(
    project: TaskProject,
    column: TaskWorkflowColumn,
    hidden: boolean,
  ) {
    const workflow = projectWorkflow(project).map((item) =>
      item.id === column.id
        ? { ...item, ...(hidden ? { hidden: true } : { hidden: undefined }) }
        : item,
    );
    try {
      await updateWorkflow.mutateAsync({ id: project.id, input: { workflow } });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Column visibility failed.",
      );
    }
  }

  async function reorderColumn(
    project: TaskProject,
    fromId: string,
    toId: string,
  ) {
    const workflow = [...projectWorkflow(project)];
    const from = workflow.findIndex((item) => item.id === fromId);
    const to = workflow.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = workflow.splice(from, 1);
    if (!moved) return;
    workflow.splice(to, 0, moved);
    try {
      await updateWorkflow.mutateAsync({ id: project.id, input: { workflow } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Column move failed.");
    }
  }

  return {
    projectAction,
    workflowAction,
    error,
    saving:
      updateProject.isPending ||
      updateWorkflow.isPending ||
      archiveProject.isPending ||
      deleteProject.isPending,
    openProjectAction: (action: ProjectAction, project: TaskProject) => {
      setError(null);
      setProjectAction({ action, project });
    },
    openWorkflowAction: (
      action: WorkflowAction,
      project: TaskProject,
      column?: TaskWorkflowColumn,
    ) => {
      setError(null);
      setWorkflowAction({ action, project, column });
    },
    moveColumn,
    reorderColumn,
    setColumnHidden,
    closeProjectAction: () => setProjectAction(null),
    closeWorkflowAction: () => setWorkflowAction(null),
    submitProjectAction,
    submitWorkflowAction,
  };
}

export function TaskManagementDialogs({
  management,
  issues,
}: {
  management: ReturnType<typeof useTaskManagement>;
  issues: TaskIssue[];
}) {
  return (
    <>
      {management.projectAction ? (
        <ProjectActionDialog
          {...management.projectAction}
          error={management.error}
          saving={management.saving}
          onClose={management.closeProjectAction}
          onSubmit={(value) => void management.submitProjectAction(value)}
        />
      ) : null}
      {management.workflowAction ? (
        <WorkflowDialog
          action={management.workflowAction.action}
          column={management.workflowAction.column}
          workflow={projectWorkflow(management.workflowAction.project)}
          issueCount={
            issues.filter(
              (issue) =>
                issue.project === management.workflowAction?.project.id &&
                issue.status === management.workflowAction?.column?.id,
            ).length
          }
          error={management.error}
          saving={management.saving}
          onClose={management.closeWorkflowAction}
          onSubmit={(value) => void management.submitWorkflowAction(value)}
        />
      ) : null}
    </>
  );
}
