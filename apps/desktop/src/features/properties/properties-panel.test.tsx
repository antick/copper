import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { PropertiesPanel } from "./properties-panel";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  update: vi.fn(),
  flush: vi.fn(),
}));
vi.mock("@/lib/copper", () => ({
  copper: {
    properties: {
      read: (...args: unknown[]) => mocks.read(...args),
      update: (...args: unknown[]) => mocks.update(...args),
    },
    search: { indexFile: async () => undefined },
  },
}));
vi.mock("@/lib/copper/events", () => ({
  flushOpenDocuments: () => mocks.flush(),
}));
beforeEach(() => {
  mocks.read.mockReset().mockResolvedValue({
    raw: "status: todo",
    body: "Old cached body",
    values: { status: "todo" },
  });
  mocks.update
    .mockReset()
    .mockResolvedValue([
      "---\nstatus: done\n---\nLatest body",
      { hash: "new", path: "Note.md", size: 1, mtimeNs: 1 },
    ]);
  mocks.flush.mockReset().mockResolvedValue(undefined);
});
function mount() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PropertiesPanel vaultId="v" path="Note.md" />
    </QueryClientProvider>,
  );
}
it("flushes unsaved text before sending a property-only patch", async () => {
  mount();
  const status = await screen.findByDisplayValue("todo");
  fireEvent.change(status, { target: { value: "done" } });
  fireEvent.blur(status);
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith("v", "Note.md", {
      status: "done",
    }),
  );
  expect(mocks.flush.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.update.mock.invocationCallOrder[0],
  );
});
it("does not patch properties when saving the active document fails", async () => {
  mocks.flush.mockRejectedValue(new Error("Disk full"));
  mount();
  const status = await screen.findByDisplayValue("todo");
  fireEvent.change(status, { target: { value: "done" } });
  fireEvent.blur(status);
  expect(await screen.findByRole("alert")).toHaveTextContent("Disk full");
  expect(mocks.update).not.toHaveBeenCalled();
});
it("adds properties with the shared app dialog and restores focus on cancel", async () => {
  const prompt = vi.spyOn(window, "prompt");
  const user = userEvent.setup();
  mount();
  const trigger = await screen.findByRole("button", { name: "Add property" });
  await user.click(trigger);
  const input = await screen.findByRole("textbox", { name: "Property name" });
  expect(input).toHaveFocus();
  await user.type(input, "author{Enter}");
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith("v", "Note.md", { author: "" }),
  );
  expect(prompt).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await user.click(trigger);
  await screen.findByRole("textbox", { name: "Property name" });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
  prompt.mockRestore();
});
it("keeps duplicate property errors in the dialog without changing the note", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(await screen.findByRole("button", { name: "Add property" }));
  await user.type(
    await screen.findByRole("textbox", { name: "Property name" }),
    "status{Enter}",
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  expect(mocks.update).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeVisible();
});
