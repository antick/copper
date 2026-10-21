import { EditorView } from "@codemirror/view";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskDescriptionEditor } from "@/features/tasks/task-description-editor";
import {
  TaskSourceButton,
  TaskSourceProvider,
} from "@/features/tasks/task-source";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/copper", () => ({ copper: { files: mocks } }));
beforeEach(() => {
  mocks.read.mockReset();
});

function mount(
  onSave: (body: string) => Promise<void>,
  onOpen = vi.fn(),
  issueId = "ISSUE-1",
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <TaskSourceProvider vaultId="demo" onOpen={onOpen}>
          <TaskDescriptionEditor
            documentId={issueId}
            body="original"
            ariaLabel="Issue description"
            onSave={onSave}
          />
          <TaskSourceButton path={`.copper/tasks/issues/${issueId}.md`} />
        </TaskSourceProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  const view = EditorView.findFromDOM(
    screen.getByLabelText("Issue description"),
  );
  act(() =>
    view?.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "latest changes" },
    }),
  );
  return onOpen;
}

it("flushes a pending description before reading and opening its source", async () => {
  let saved = "original";
  const save = vi.fn(async (body: string) => {
    saved = body;
  });
  mocks.read.mockImplementation(async () => [
    `# Issue\n\n${saved}`,
    "revision",
  ]);
  const open = mount(save, vi.fn(), "ISSUE-1");
  await userEvent.click(screen.getByRole("button", { name: "Edit source" }));
  await waitFor(() =>
    expect(open).toHaveBeenCalledWith(".copper/tasks/issues/ISSUE-1.md"),
  );
  expect(save).toHaveBeenCalledWith("latest changes");
  expect(saved).toBe("latest changes");
  expect(mocks.read).toHaveBeenCalledWith(
    "demo",
    ".copper/tasks/issues/ISSUE-1.md",
  );
});

it("keeps the task and its draft open when saving before source editing fails", async () => {
  const open = mount(
    async () => {
      throw new Error("Disk is full");
    },
    vi.fn(),
    "ISSUE-2",
  );
  await userEvent.click(screen.getByRole("button", { name: "Edit source" }));
  expect(
    await screen.findByRole("dialog", { name: "Couldn’t open source" }),
  ).toHaveTextContent("Disk is full");
  expect(open).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Issue description")).toHaveTextContent(
    "latest changes",
  );
});

it("shows source read failures without switching away from the task", async () => {
  mocks.read.mockImplementation(async () => {
    throw new Error("Source file was removed");
  });
  const open = mount(async () => undefined, vi.fn(), "ISSUE-3");
  await userEvent.click(screen.getByRole("button", { name: "Edit source" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "Source file was removed",
  );
  expect(open).not.toHaveBeenCalled();
});
