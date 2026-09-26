import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { copper } from "@/lib/copper";
import type {
  CreateIssueInput,
  CreateProjectInput,
  MoveIssueInput,
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
  UpdateProjectInput,
  UpdateProjectWorkflowInput,
} from "@/lib/copper/tasks";

export const taskKeys = {
  issues: (vaultId: string) => ["vault", vaultId, "tasks", "issues"] as const,
  projects: (vaultId: string) =>
    ["vault", vaultId, "tasks", "projects"] as const,
  issue: (vaultId: string, id: string) =>
    ["vault", vaultId, "tasks", "issue", id] as const,
  project: (vaultId: string, id: string) =>
    ["vault", vaultId, "tasks", "project", id] as const,
};

export function useTaskIssues(vaultId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.issues(vaultId ?? ""),
    queryFn: () => copper.tasks.listIssues(vaultId ?? ""),
    enabled: Boolean(vaultId),
  });
}

export function useTaskProjects(vaultId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.projects(vaultId ?? ""),
    queryFn: () => copper.tasks.listProjects(vaultId ?? ""),
    enabled: Boolean(vaultId),
  });
}

export function useTaskIssue(vaultId: string | undefined, id: string | null) {
  return useQuery({
    queryKey: taskKeys.issue(vaultId ?? "", id ?? ""),
    queryFn: () => copper.tasks.getIssue(vaultId ?? "", id ?? ""),
    enabled: Boolean(vaultId && id),
  });
}

export function useTaskProject(vaultId: string | undefined, id: string | null) {
  return useQuery({
    queryKey: taskKeys.project(vaultId ?? "", id ?? ""),
    queryFn: () => copper.tasks.getProject(vaultId ?? "", id ?? ""),
    enabled: Boolean(vaultId && id),
  });
}

function invalidateTasks(
  queryClient: ReturnType<typeof useQueryClient>,
  vaultId: string,
) {
  void queryClient.invalidateQueries({ queryKey: taskKeys.issues(vaultId) });
  void queryClient.invalidateQueries({ queryKey: taskKeys.projects(vaultId) });
}

function syncIssue(
  queryClient: ReturnType<typeof useQueryClient>,
  vaultId: string,
  issue: TaskIssue,
) {
  queryClient.setQueryData<TaskIssue[]>(taskKeys.issues(vaultId), (rows) =>
    rows?.map((row) => (row.id === issue.id ? issue : row)),
  );
  queryClient.setQueryData(taskKeys.issue(vaultId, issue.id), issue);
}

export function useUpdateIssue(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIssueInput }) =>
      copper.tasks.updateIssue(vaultId ?? "", id, input),
    onMutate: ({ id, input }) => {
      if (!vaultId) return;
      void queryClient.cancelQueries({ queryKey: taskKeys.issues(vaultId) });
      const previous = queryClient.getQueryData<TaskIssue[]>(
        taskKeys.issues(vaultId),
      );
      const previousIssue = queryClient.getQueryData<TaskIssue>(
        taskKeys.issue(vaultId, id),
      );
      queryClient.setQueryData<TaskIssue[]>(taskKeys.issues(vaultId), (rows) =>
        rows?.map((issue) =>
          issue.id === id ? { ...issue, ...input } : issue,
        ),
      );
      queryClient.setQueryData<TaskIssue>(
        taskKeys.issue(vaultId, id),
        (current) => (current ? { ...current, ...input } : current),
      );
      return { previous, previousIssue };
    },
    onError: (_error, variables, context) => {
      if (vaultId && context?.previous) {
        queryClient.setQueryData(taskKeys.issues(vaultId), context.previous);
      }
      if (vaultId && context?.previousIssue) {
        queryClient.setQueryData(
          taskKeys.issue(vaultId, variables.id),
          context.previousIssue,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      if (!vaultId) return;
      invalidateTasks(queryClient, vaultId);
      void queryClient.invalidateQueries({
        queryKey: taskKeys.issue(vaultId, variables.id),
      });
    },
  });
}

export function useMoveIssue(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveIssueInput }) =>
      copper.tasks.moveIssue(vaultId ?? "", id, input),
    onMutate: ({ id, input }) => {
      if (!vaultId) return;
      void queryClient.cancelQueries({ queryKey: taskKeys.issues(vaultId) });
      const previous = queryClient.getQueryData<TaskIssue[]>(
        taskKeys.issues(vaultId),
      );
      queryClient.setQueryData<TaskIssue[]>(
        taskKeys.issues(vaultId),
        (rows) => {
          if (!rows) return rows;
          const moved = rows.find((issue) => issue.id === id);
          if (!moved) return rows;
          const next = rows.filter((issue) => issue.id !== id);
          const updated = { ...moved, status: input.status ?? moved.status };
          const beforeIndex = input.beforeId
            ? next.findIndex((issue) => issue.id === input.beforeId)
            : -1;
          const afterIndex = input.afterId
            ? next.findIndex((issue) => issue.id === input.afterId)
            : -1;
          const statusEnd = next.reduce(
            (last, issue, index) =>
              issue.status === updated.status ? index + 1 : last,
            0,
          );
          const insertAt =
            beforeIndex >= 0
              ? beforeIndex
              : afterIndex >= 0
                ? afterIndex + 1
                : statusEnd;
          next.splice(insertAt, 0, updated);
          return next;
        },
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (vaultId && context?.previous) {
        queryClient.setQueryData(taskKeys.issues(vaultId), context.previous);
      }
    },
    onSettled: () => {
      if (vaultId) invalidateTasks(queryClient, vaultId);
    },
  });
}

export function useAddIssueComment(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      copper.tasks.addIssueComment(vaultId ?? "", id, body),
    onSuccess: (issue) => {
      if (vaultId) syncIssue(queryClient, vaultId, issue);
    },
  });
}

export function useUpdateIssueComment(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      commentId,
      body,
    }: {
      id: string;
      commentId: string;
      body: string;
    }) => copper.tasks.updateIssueComment(vaultId ?? "", id, commentId, body),
    onSuccess: (issue) => {
      if (vaultId) syncIssue(queryClient, vaultId, issue);
    },
  });
}

export function useDeleteIssueComment(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commentId }: { id: string; commentId: string }) =>
      copper.tasks.deleteIssueComment(vaultId ?? "", id, commentId),
    onSuccess: (issue) => {
      if (vaultId) syncIssue(queryClient, vaultId, issue);
    },
  });
}

export function useCreateIssue(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIssueInput) =>
      copper.tasks.createIssue(vaultId ?? "", input),
    onSuccess: () => {
      if (vaultId) invalidateTasks(queryClient, vaultId);
    },
  });
}

export function useCreateProject(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      copper.tasks.createProject(vaultId ?? "", input),
    onSuccess: () => {
      if (vaultId) invalidateTasks(queryClient, vaultId);
    },
  });
}

export function useUpdateProject(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      copper.tasks.updateProject(vaultId ?? "", id, input),
    onMutate: async ({ id, input }) => {
      if (!vaultId) return;
      const previous = queryClient.getQueryData<TaskProject[]>(
        taskKeys.projects(vaultId),
      );
      const previousProject = queryClient.getQueryData<TaskProject>(
        taskKeys.project(vaultId, id),
      );
      queryClient.setQueryData<TaskProject[]>(
        taskKeys.projects(vaultId),
        (rows) =>
          rows?.map((project) =>
            project.id === id ? { ...project, ...input } : project,
          ),
      );
      queryClient.setQueryData<TaskProject>(
        taskKeys.project(vaultId, id),
        (project) => (project ? { ...project, ...input } : project),
      );
      return { previous, previousProject };
    },
    onError: (_error, variables, context) => {
      if (vaultId && context?.previous) {
        queryClient.setQueryData(taskKeys.projects(vaultId), context.previous);
      }
      if (vaultId && context?.previousProject) {
        queryClient.setQueryData(
          taskKeys.project(vaultId, variables.id),
          context.previousProject,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      if (vaultId) {
        invalidateTasks(queryClient, vaultId);
        void queryClient.invalidateQueries({
          queryKey: taskKeys.project(vaultId, variables.id),
        });
      }
    },
  });
}

export function useUpdateProjectWorkflow(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateProjectWorkflowInput;
    }) => copper.tasks.updateProjectWorkflow(vaultId ?? "", id, input),
    onSuccess: (_result, variables) => {
      if (vaultId) {
        invalidateTasks(queryClient, vaultId);
        void queryClient.invalidateQueries({
          queryKey: taskKeys.project(vaultId, variables.id),
        });
      }
    },
  });
}

export function useArchiveProject(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => copper.tasks.archiveProject(vaultId ?? "", id),
    onSuccess: (_result, id) => {
      if (vaultId) {
        invalidateTasks(queryClient, vaultId);
        queryClient.removeQueries({ queryKey: taskKeys.project(vaultId, id) });
      }
    },
  });
}

export function useDeleteProject(vaultId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => copper.tasks.deleteProject(vaultId ?? "", id),
    onSuccess: (_result, id) => {
      if (vaultId) {
        invalidateTasks(queryClient, vaultId);
        queryClient.removeQueries({ queryKey: taskKeys.project(vaultId, id) });
      }
    },
  });
}
