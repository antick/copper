import { EditorView } from "@codemirror/view";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { taskKeys } from "@/features/tasks/queries";
import { initialTaskTabsState } from "@/features/tasks/task-tabs";
import { TasksWorkspace } from "@/features/tasks/tasks-workspace";
import type { TaskProject } from "@/lib/copper/tasks";

const mocks = vi.hoisted(() => {
  const project: TaskProject = {
    path: ".copper/tasks/projects/copper.md",
    id: "copper",
    title: "Copper",
    status: "started",
    labels: [],
    start: null,
    target: null,
    counts: {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      canceled: 0,
    },
    body: "# Copper\n",
  };
  return {
    project,
    listProjects: vi.fn(async () => [project]),
    getProject: vi.fn(async () => project),
  };
});

vi.mock("@/lib/copper", () => ({
  copper: {
    tasks: {
      listIssues: async () => [],
      listProjects: mocks.listProjects,
      getIssue: async () => null,
      getProject: mocks.getProject,
      createIssue: async () => null,
      createProject: async () => mocks.project,
      updateIssue: async () => null,
      moveIssue: async () => null,
      updateProject: async () => mocks.project,
      updateProjectWorkflow: async () => mocks.project,
      archiveProject: async () => undefined,
      deleteProject: async () => undefined,
    },
  },
}));

function renderProjectOverview(projectId = "copper") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tabsState = {
    ...initialTaskTabsState,
    tabs: [
      {
        ...initialTaskTabsState.tabs[0],
        target: {
          kind: "project" as const,
          project: projectId,
          view: "overview" as const,
        },
      },
    ],
  };
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TasksWorkspace
          vaultId="demo"
          tabsState={tabsState}
          onTabsAction={() => undefined}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("project overview details", () => {
  beforeEach(() => {
    mocks.listProjects.mockReset().mockResolvedValue([mocks.project]);
    mocks.getProject.mockReset().mockResolvedValue(mocks.project);
  });

  it("waits for full project details before opening its overview editor", async () => {
    const restoredProject: TaskProject = {
      ...mocks.project,
      path: ".copper/tasks/projects/nested-project.md",
      id: "nested-project",
      title: "Restorable nested project",
      body: "# Restorable nested project\nArchived project body\n",
    };
    const projectSummary: TaskProject = { ...restoredProject, body: undefined };
    let resolveDetails: (value: TaskProject) => void = () => {};
    mocks.listProjects.mockResolvedValueOnce([projectSummary]);
    mocks.getProject.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDetails = resolve;
        }),
    );

    const queryClient = renderProjectOverview("nested-project");
    await waitFor(() =>
      expect(queryClient.getQueryData(taskKeys.projects("demo"))).toEqual([
        projectSummary,
      ]),
    );

    expect(screen.getByText("Loading project")).toBeVisible();
    expect(screen.queryByTestId("task-description-editor")).toBeNull();

    await act(async () => resolveDetails(restoredProject));
    const description = await screen.findByLabelText("Project description");
    const editor = EditorView.findFromDOM(description as HTMLElement);
    expect(editor?.state.doc.toString()).toBe("Archived project body\n");
  });

  it("shows the detail retry state instead of opening a summary-only editor", async () => {
    const projectSummary: TaskProject = { ...mocks.project, body: undefined };
    mocks.listProjects.mockResolvedValueOnce([projectSummary]);
    mocks.getProject.mockRejectedValueOnce(
      new Error("Project details are unavailable"),
    );

    const queryClient = renderProjectOverview();
    await waitFor(() =>
      expect(queryClient.getQueryData(taskKeys.projects("demo"))).toEqual([
        projectSummary,
      ]),
    );

    expect(
      await screen.findByText("Project could not be loaded"),
    ).toBeVisible();
    expect(screen.queryByTestId("task-description-editor")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  it("keeps pending description text while the same project refreshes", async () => {
    const initialProject: TaskProject = {
      ...mocks.project,
      body: "# Copper\nSaved description\n",
    };
    const refreshedProject: TaskProject = {
      ...initialProject,
      body: "# Copper\nRefreshed description\n",
    };
    let resolveRefresh: (value: TaskProject) => void = () => {};
    mocks.listProjects.mockResolvedValueOnce([
      { ...initialProject, body: undefined },
    ]);
    mocks.getProject
      .mockResolvedValueOnce(initialProject)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    const queryClient = renderProjectOverview();
    const description = await screen.findByLabelText("Project description");
    const editor = EditorView.findFromDOM(description as HTMLElement);
    expect(editor?.state.doc.toString()).toBe("Saved description\n");

    act(() =>
      editor?.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: "Pending description",
        },
      }),
    );
    act(() => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.project("demo", "copper"),
      });
    });
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledTimes(2));

    expect(screen.getByLabelText("Project description")).toBeInTheDocument();
    expect(editor?.state.doc.toString()).toBe("Pending description");

    await act(async () => resolveRefresh(refreshedProject));
    await waitFor(() =>
      expect(
        queryClient.getQueryData(taskKeys.project("demo", "copper")),
      ).toEqual(refreshedProject),
    );
    expect(
      EditorView.findFromDOM(
        screen.getByLabelText("Project description") as HTMLElement,
      )?.state.doc.toString(),
    ).toBe("Pending description");
  });
});
