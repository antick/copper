import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  clearDocumentDraft,
  documentDraftKey,
  keepDocumentDraft,
  readDocumentDraft,
} from "@/features/editor/document-drafts";
import { initialTaskTabsState } from "@/features/tasks/task-tabs";
import { TasksWorkspace } from "@/features/tasks/tasks-workspace";

const mocks = vi.hoisted(() => {
  const issue = {
    path: ".copper/tasks/issues/COPP-1-board.md",
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
  const project = {
    path: ".copper/tasks/projects/copper.md",
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
  const archivedIssue = {
    ...issue,
    path: ".copper/tasks/archive/issues/COPP-2-old-board.md",
    id: "COPP-2",
    title: "Old board",
  };
  const archivedProject = {
    ...project,
    path: ".copper/tasks/archive/projects/old-project.md",
    id: "old-project",
    title: "Old project",
    archived: true,
  };
  return {
    issue,
    project,
    archivedIssue,
    archivedProject,
    listIssues: vi.fn(
      async (_vaultId: string, options?: { includeArchived?: boolean }) =>
        options?.includeArchived ? [issue, archivedIssue] : [issue],
    ),
    restore: vi.fn(async (_vaultId: string, path: string) =>
      path.replace(".copper/tasks/archive/", ".copper/tasks/"),
    ),
    removeIndexed: vi.fn(async () => undefined),
    indexFile: vi.fn(async () => undefined),
    updateIssue: vi.fn(async () => issue),
  };
});

vi.mock("@/lib/copper", () => ({
  copper: {
    tasks: {
      listIssues: mocks.listIssues,
      listProjects: async () => [mocks.project, mocks.archivedProject],
      getIssue: async () => mocks.issue,
      getProject: async () => mocks.project,
      createIssue: async () => mocks.issue,
      updateIssue: mocks.updateIssue,
      moveIssue: async () => mocks.issue,
      createProject: async () => mocks.project,
      updateProject: async () => mocks.project,
      updateProjectWorkflow: async () => mocks.project,
      archiveProject: async () => undefined,
      deleteProject: async () => undefined,
    },
    files: { restore: mocks.restore },
    search: {
      removeIndexed: mocks.removeIndexed,
      indexFile: mocks.indexFile,
    },
  },
}));

function renderTasks(selectedIssueId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const target = selectedIssueId
    ? { kind: "issue" as const, issue: selectedIssueId }
    : {
        kind: "destination" as const,
        destination: "all" as const,
        view: "board" as const,
      };
  const tabsState = {
    ...initialTaskTabsState,
    tabs: [{ ...initialTaskTabsState.tabs[0], target }],
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TasksWorkspace
          vaultId="demo"
          vaultName="Demo Vault"
          platform="macos"
          tabsState={tabsState}
          onTabsAction={vi.fn()}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.listIssues.mockClear();
  mocks.restore.mockClear();
  mocks.removeIndexed.mockClear();
  mocks.indexFile.mockClear();
  mocks.updateIssue.mockClear();
});

it("opens the shared composer from a column with its status selected", async () => {
  const user = userEvent.setup();
  renderTasks();
  await screen.findByText("Fast board");
  await user.click(screen.getByRole("button", { name: "New Canceled issue" }));
  expect(
    screen.getByRole("button", { name: "Issue status" }),
  ).toHaveTextContent("Canceled");
  expect(
    screen.getByRole("button", { name: "Issue project" }),
  ).toHaveTextContent("No project");
});

it("restores archived projects and issues from the Tasks toolbar", async () => {
  const user = userEvent.setup();
  renderTasks();
  await user.click(screen.getByRole("button", { name: "Archived items" }));
  const dialog = await screen.findByRole("dialog", { name: "Archived items" });
  expect(within(dialog).getByText("Old project")).toBeInTheDocument();
  expect(within(dialog).getByText("Old board")).toBeInTheDocument();

  await user.click(
    within(dialog).getByRole("button", {
      name: "Restore COPP-2: Old board",
    }),
  );
  await waitFor(() =>
    expect(mocks.restore).toHaveBeenCalledWith(
      "demo",
      ".copper/tasks/archive/issues/COPP-2-old-board.md",
    ),
  );
  expect(mocks.removeIndexed).toHaveBeenCalledWith(
    "demo",
    ".copper/tasks/archive/issues/COPP-2-old-board.md",
  );
  expect(mocks.indexFile).toHaveBeenCalledWith(
    "demo",
    ".copper/tasks/issues/COPP-2-old-board.md",
  );
  await user.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Archived items" }),
    ).toHaveFocus(),
  );
});

it("keeps an archived source in place when an unsaved draft blocks restore", async () => {
  const user = userEvent.setup();
  const sourcePath = ".copper/tasks/archive/issues/COPP-2-old-board.md";
  const draftKey = documentDraftKey("demo", sourcePath);
  keepDocumentDraft(draftKey, {
    contents: "My failed source draft",
    baseHash: "old",
  });

  try {
    renderTasks();
    await user.click(screen.getByRole("button", { name: "Archived items" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Archived items",
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: "Restore COPP-2: Old board",
      }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Unsaved note drafts remain. Reopen those notes and save or resolve their conflicts before continuing.",
    );
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(mocks.removeIndexed).not.toHaveBeenCalled();
    expect(mocks.indexFile).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Old board")).toBeInTheDocument();
    expect(readDocumentDraft(draftKey)?.contents).toBe(
      "My failed source draft",
    );
    expect(localStorage.getItem(draftKey)).toContain("My failed source draft");
  } finally {
    clearDocumentDraft(draftKey);
  }
});

it("waits for an open archived source draft to save before restoring", async () => {
  const user = userEvent.setup();
  const sourcePath = ".copper/tasks/archive/issues/COPP-2-old-board.md";
  const draftKey = documentDraftKey("demo", sourcePath);
  keepDocumentDraft(draftKey, {
    contents: "Draft waiting to save",
    baseHash: "old",
  });

  let resolveSave!: () => void;
  const save = new Promise<void>((resolve) => {
    resolveSave = resolve;
  });
  let flushEnqueuedSave = false;
  const onFlush = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        enqueue: (promise: Promise<void>) => void;
      }>
    ).detail;
    flushEnqueuedSave = true;
    detail.enqueue(save.then(() => clearDocumentDraft(draftKey)));
  };
  window.addEventListener("copper:flush-documents", onFlush);

  try {
    renderTasks();
    await user.click(screen.getByRole("button", { name: "Archived items" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Archived items",
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: "Restore COPP-2: Old board",
      }),
    );

    await waitFor(() => expect(flushEnqueuedSave).toBe(true));
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(readDocumentDraft(draftKey)?.contents).toBe("Draft waiting to save");

    await act(async () => {
      resolveSave();
      await save;
    });
    await waitFor(() =>
      expect(mocks.restore).toHaveBeenCalledWith("demo", sourcePath),
    );
    expect(readDocumentDraft(draftKey)).toBeUndefined();
    expect(mocks.removeIndexed).toHaveBeenCalledWith("demo", sourcePath);
    expect(mocks.indexFile).toHaveBeenCalledWith(
      "demo",
      ".copper/tasks/issues/COPP-2-old-board.md",
    );
  } finally {
    window.removeEventListener("copper:flush-documents", onFlush);
    clearDocumentDraft(draftKey);
  }
});

it("keeps the archive dialog open and shows restore collisions", async () => {
  const user = userEvent.setup();
  mocks.restore.mockRejectedValueOnce(
    new Error("Archive destination already exists"),
  );
  renderTasks();
  await user.click(screen.getByRole("button", { name: "Archived items" }));
  const dialog = await screen.findByRole("dialog", { name: "Archived items" });
  await user.click(
    within(dialog).getByRole("button", { name: "Restore Old project" }),
  );
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Archive destination already exists",
  );
  expect(dialog).toBeInTheDocument();
});

it("edits issue labels from the context menu with current labels as defaults", async () => {
  const user = userEvent.setup();
  renderTasks();
  const card = await screen.findByRole("button", { name: /Fast board/ });
  fireEvent.contextMenu(card);
  await user.click(
    await screen.findByRole("menuitem", { name: "Set labels…" }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: "Edit issue labels",
  });
  const input = within(dialog).getByRole("textbox", { name: "Labels" });
  expect(input).toHaveValue("ui");
  await user.clear(input);
  await user.type(input, "bug, polish");
  await user.click(within(dialog).getByRole("button", { name: "Save labels" }));
  await waitFor(() =>
    expect(mocks.updateIssue).toHaveBeenCalledWith("demo", "COPP-1", {
      labels: ["bug", "polish"],
    }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Edit issue labels" }),
    ).toBeNull(),
  );
});
