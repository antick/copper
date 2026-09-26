import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initialTaskTabsState } from "@/features/tasks/task-tabs";
import { TasksWorkspace } from "@/features/tasks/tasks-workspace";
import type {
  TasksDestination,
  TasksProjectView,
  TasksTabTarget,
  TasksView,
} from "@/lib/copper/settings";

const mocks = vi.hoisted(() => {
  const issue = {
    path: "Tasks/Issues/COPP-1-board.md",
    id: "COPP-1",
    title: "Fast board",
    status: "todo" as const,
    priority: "high" as const,
    project: "copper",
    labels: ["ui"],
    due: null,
    rank: "A",
    created: "",
    updated: "",
    body: "# Fast board\n",
  };
  const createdProject = {
    path: "Tasks/Projects/inbox.md",
    id: "inbox",
    title: "Inbox",
    status: "planned" as const,
    labels: [],
    start: null,
    target: null,
    counts: {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      done: 0,
      canceled: 0,
    },
  };
  const project = {
    path: "Tasks/Projects/copper.md",
    id: "copper",
    title: "Copper",
    status: "started" as const,
    labels: ["desktop"],
    start: "2026-08-01",
    target: "2026-10-01",
    counts: {
      backlog: 0,
      todo: 1,
      in_progress: 0,
      in_review: 0,
      done: 0,
      canceled: 0,
    },
    body: "# Copper\n",
  };
  return {
    issue,
    project,
    createdProject,
    createIssue: vi.fn(async () => issue),
    createProject: vi.fn(async () => createdProject),
    updateIssue: vi.fn(async () => issue),
    updateProject: vi.fn(async () => project),
    updateProjectWorkflow: vi.fn(async () => project),
    archiveProject: vi.fn(async () => undefined),
    deleteProject: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/copper", () => ({
  copper: {
    tasks: {
      listIssues: async () => [mocks.issue],
      listProjects: async () => [mocks.project],
      getIssue: async () => mocks.issue,
      getProject: async () => mocks.project,
      createIssue: mocks.createIssue,
      updateIssue: mocks.updateIssue,
      moveIssue: async () => mocks.issue,
      createProject: mocks.createProject,
      updateProject: mocks.updateProject,
      updateProjectWorkflow: mocks.updateProjectWorkflow,
      archiveProject: mocks.archiveProject,
      deleteProject: mocks.deleteProject,
    },
  },
}));

type RenderTasksOptions = Omit<
  Partial<Parameters<typeof TasksWorkspace>[0]>,
  "tabsState"
> & {
  view?: TasksView;
  destination?: TasksDestination;
  project?: string | null;
  projectView?: TasksProjectView;
  selectedIssueId?: string | null;
};

function renderTasks(options: RenderTasksOptions = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const {
    view = "board",
    destination = "all",
    project = null,
    projectView = "board",
    selectedIssueId,
    onTabsAction = vi.fn(),
    ...props
  } = options;
  const target: TasksTabTarget = selectedIssueId
    ? { kind: "issue", issue: selectedIssueId }
    : destination === "project" && project
      ? { kind: "project", project, view: projectView }
      : {
          kind: "destination",
          destination: destination === "project" ? "all" : destination,
          view,
        };
  const tabsState = {
    ...initialTaskTabsState,
    tabs: [{ ...initialTaskTabsState.tabs[0], target }],
  };
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <TasksWorkspace
          vaultId="demo"
          vaultName="Demo Vault"
          platform="macos"
          tabsState={tabsState}
          onTabsAction={onTabsAction}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("TasksWorkspace", () => {
  beforeEach(() => {
    mocks.createIssue.mockClear();
    mocks.createProject.mockClear();
    mocks.updateIssue.mockClear();
    mocks.updateProject.mockClear();
    mocks.updateProjectWorkflow.mockClear();
    mocks.archiveProject.mockClear();
    mocks.deleteProject.mockClear();
  });

  it("keeps the macOS navigation divider below the title bar", async () => {
    renderTasks();
    await screen.findByText("Fast board");
    expect(screen.getByRole("separator")).toHaveAttribute(
      "data-line-below-header",
      "true",
    );
  });

  it("keeps the sidebar restore control in the Tasks top bar", async () => {
    const onToggleLeft = vi.fn();
    renderTasks({ leftCollapsed: true, onToggleLeft });
    await screen.findByText("Fast board");
    expect(screen.queryByLabelText("Tasks navigation")).toBeNull();
    const restore = screen.getByRole("button", { name: "Show left sidebar" });
    await userEvent.click(restore);
    expect(onToggleLeft).toHaveBeenCalledOnce();
  });

  it("opens the shared composer from a column with its status selected", async () => {
    const user = userEvent.setup();
    renderTasks();
    await screen.findByText("Fast board");
    await user.click(
      screen.getByRole("button", { name: "New Canceled issue" }),
    );
    expect(
      screen.getByRole("button", { name: "Issue status" }),
    ).toHaveTextContent("Canceled");
    expect(
      screen.getByRole("button", { name: "Issue project" }),
    ).toHaveTextContent("No project");
  });

  it("opens project actions from the shared right-click menu", async () => {
    const user = userEvent.setup();
    renderTasks();
    const project = await screen.findByRole("button", { name: /Copper 1/ });
    fireEvent.contextMenu(project);
    expect(
      await screen.findByRole("menuitem", { name: "Change icon" }),
    ).toBeVisible();
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(
      screen.getByRole("dialog", { name: "Rename project" }),
    ).toBeVisible();
  });

  it("pins projects from the shared context menu", async () => {
    const user = userEvent.setup();
    const onPinnedProjectsChange = vi.fn();
    renderTasks({ onPinnedProjectsChange });
    const project = await screen.findByRole("button", { name: /Copper 1/ });
    fireEvent.contextMenu(project);
    await user.click(screen.getByRole("menuitem", { name: "Pin" }));
    expect(onPinnedProjectsChange).toHaveBeenCalledWith(["copper"]);
  });

  it("keeps a project available when archive fails", async () => {
    const user = userEvent.setup();
    mocks.archiveProject.mockRejectedValueOnce(
      new Error("Archive unavailable"),
    );
    renderTasks();
    const project = await screen.findByRole("button", { name: /Copper 1/ });
    fireEvent.contextMenu(project);
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Archive project" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Archive unavailable",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: /Copper 1/ }),
    ).toBeInTheDocument();
  });

  it("labels the Tasks title row Tasks instead of the vault name", async () => {
    renderTasks();
    expect(await screen.findByText("Fast board")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide left sidebar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide note list" })).toBeNull();
    const title = document.querySelector(".copper-title-region");
    expect(title?.textContent).toMatch(/Tasks/);
    expect(title?.textContent).not.toMatch(/Demo Vault/i);
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Active" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Backlog" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Completed" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search Vault" })).toBeNull();
  });

  it("opens a new issue dialog from C when the board is focused", async () => {
    const user = userEvent.setup();
    renderTasks();
    expect(await screen.findByText("Fast board")).toBeInTheDocument();
    await user.keyboard("c");
    expect(screen.getByRole("heading", { name: "New issue" })).toBeVisible();
    expect(screen.getByLabelText("New issue title")).toBeInTheDocument();
    expect(screen.getByLabelText("Issue description")).toBeInTheDocument();
    expect(screen.getByLabelText("Issue status")).toBeInTheDocument();
    expect(screen.getByLabelText("Issue priority")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create issue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("creates a project from the dialog and ignores cancel", async () => {
    const user = userEvent.setup();
    const onTabsAction = vi.fn();
    renderTasks({ onTabsAction });
    await screen.findByText("Fast board");
    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(screen.getByRole("heading", { name: "New project" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "New project" })).toBeNull();
    expect(mocks.createProject).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("New project name"), "Inbox");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(mocks.createProject).toHaveBeenCalledWith("demo", {
      name: "Inbox",
      status: "planned",
      labels: [],
      start: null,
      target: null,
    });
    expect(onTabsAction).toHaveBeenCalledWith({
      type: "navigate",
      target: { kind: "project", project: "inbox", view: "overview" },
    });
  });

  it("creates an issue from the composer with properties", async () => {
    const user = userEvent.setup();
    renderTasks();
    await screen.findByText("Fast board");
    await user.click(screen.getByRole("button", { name: "New issue" }));
    await user.type(screen.getByLabelText("New issue title"), "Ship table");
    await user.type(
      screen.getByLabelText("Issue description"),
      "Make it Linear",
    );
    await user.click(screen.getByRole("button", { name: "Create issue" }));
    expect(mocks.createIssue).toHaveBeenCalledWith("demo", {
      title: "Ship table",
      body: "Make it Linear",
      status: "todo",
      priority: "none",
      project: null,
      labels: [],
      due: null,
    });
    expect(await screen.findByLabelText("Issue title")).toHaveValue(
      "Fast board",
    );
  });

  it("renders the list as a table", async () => {
    renderTasks({ view: "list" });
    expect(
      await screen.findByRole("columnheader", { name: "Id" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("cell", { name: "COPP-1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "High" })).toBeInTheDocument();
  });

  it("opens the shared issue context menu and can open an issue tab", async () => {
    const user = userEvent.setup();
    const onTabsAction = vi.fn();
    renderTasks({ onTabsAction });
    const card = await screen.findByRole("button", { name: /COPP-1/ });
    fireEvent.contextMenu(card);
    expect(
      await screen.findByRole("menuitem", { name: /Set status/ }),
    ).toBeVisible();
    await user.click(screen.getByRole("menuitem", { name: "Open in new tab" }));
    expect(onTabsAction).toHaveBeenCalledWith({
      type: "open-pinned",
      id: expect.any(String),
      target: { kind: "issue", issue: "COPP-1" },
    });
  });

  it("uses the same issue context menu from list rows", async () => {
    renderTasks({ view: "list" });
    const row = await screen.findByRole("row", { name: /COPP-1/ });
    fireEvent.contextMenu(row);
    expect(
      await screen.findByRole("menuitem", { name: "Copy issue ID" }),
    ).toBeVisible();
  });

  it("shows the project directory and project overview surfaces", async () => {
    const { unmount } = renderTasks({ destination: "projects" });
    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("0 of 1 completed")).toBeInTheDocument();
    expect(
      screen.getByText("Oct 1, 2026", { exact: false }),
    ).toBeInTheDocument();
    unmount();

    renderTasks({
      destination: "project",
      project: "copper",
      projectView: "overview",
    });
    expect(await screen.findByLabelText("Project title")).toHaveValue("Copper");
    expect(
      screen.getByRole("button", { name: "Project status" }),
    ).toHaveTextContent("Started");
    expect(screen.getByRole("button", { name: "Issues" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board" })).toBeInTheDocument();
  });

  it("keeps project and issue controls in one header row", async () => {
    const { unmount } = renderTasks({
      destination: "project",
      project: "copper",
      projectView: "board",
    });
    await screen.findByLabelText("Copper project");
    const projectHeader = document.querySelector(".copper-task-project-header");
    expect(projectHeader).not.toBeNull();
    expect(projectHeader?.querySelector(".copper-task-toolbar")).not.toBeNull();
    expect(
      within(projectHeader as HTMLElement).getByText("Copper"),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: "New issue" })).toHaveLength(
      1,
    );
    expect(
      document.querySelector(".copper-task-content > .copper-task-toolbar"),
    ).toBeNull();
    unmount();

    renderTasks();
    const issueHeader = document.querySelector(".copper-task-content-header");
    expect(issueHeader?.querySelector(".copper-task-toolbar")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "New issue" })).toHaveLength(
      1,
    );
  });

  it("duplicates the right-clicked issue below it", async () => {
    const user = userEvent.setup();
    renderTasks();
    const card = await screen.findByRole("button", { name: /COPP-1/ });
    await user.pointer({ keys: "[MouseRight]", target: card });
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(mocks.createIssue).toHaveBeenCalledWith(
      "demo",
      expect.objectContaining({
        title: "Fast board",
        afterId: "COPP-1",
        status: "todo",
      }),
    );
  });

  it("retains a failed issue draft for retry", async () => {
    const user = userEvent.setup();
    mocks.createIssue.mockRejectedValueOnce(new Error("Vault is read-only"));
    renderTasks();
    await screen.findByText("Fast board");
    await user.click(screen.getByRole("button", { name: "New issue" }));
    const title = screen.getByLabelText("New issue title");
    await user.type(title, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Create issue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vault is read-only",
    );
    expect(title).toHaveValue("Keep this draft");
    expect(screen.getByRole("button", { name: "Create issue" })).toBeEnabled();
  });

  it("returns focus to the control that opened the composer", async () => {
    const user = userEvent.setup();
    renderTasks();
    await screen.findByText("Fast board");
    const opener = screen.getByRole("button", { name: "New issue" });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("does not steal C from the filter input or a CodeMirror surface", async () => {
    const user = userEvent.setup();
    renderTasks();
    const filter = await screen.findByRole("textbox", {
      name: "Search issues",
    });
    await user.click(filter);
    await user.keyboard("c");
    expect(filter).toHaveValue("c");
    expect(screen.queryByLabelText("New issue title")).toBeNull();

    const host = document.createElement("div");
    host.className = "cm-editor";
    const nested = document.createElement("span");
    nested.tabIndex = 0;
    host.append(nested);
    document.body.append(host);
    nested.focus();
    await user.keyboard("c");
    expect(screen.queryByLabelText("New issue title")).toBeNull();
    host.remove();
  });

  it("preserves issue command events", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("ui, desktop");
    renderTasks({ selectedIssueId: "COPP-1" });
    await screen.findByLabelText("Issue title");

    window.dispatchEvent(new Event("copper:set-issue-labels"));
    await waitFor(() =>
      expect(mocks.updateIssue).toHaveBeenCalledWith("demo", "COPP-1", {
        labels: ["ui", "desktop"],
      }),
    );
    prompt.mockRestore();
  });
});
