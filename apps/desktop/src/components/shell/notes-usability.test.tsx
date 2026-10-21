import { EditorView } from "@codemirror/view";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import {
  getAppShellMocks,
  renderShell,
  resetAppShellMocks,
} from "@/components/shell/app-shell-test-harness";

const mocks = getAppShellMocks();
beforeEach(resetAppShellMocks);

it("creates a folder through an app dialog without window.prompt", async () => {
  const prompt = vi.spyOn(window, "prompt");
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByRole("button", { name: "Add to Vault" }));
  await user.click(screen.getByRole("menuitem", { name: "New folder" }));
  expect(
    await screen.findByRole("dialog", { name: "New folder" }),
  ).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Folder name" })).toHaveFocus();
  await user.type(
    screen.getByRole("textbox", { name: "Folder name" }),
    "research",
  );
  await user.click(screen.getByRole("button", { name: "Create folder" }));
  await waitFor(() =>
    expect(mocks.createFolder).toHaveBeenCalledWith("demo", "research"),
  );
  expect(prompt).not.toHaveBeenCalled();
});

it("returns keyboard focus to the folder button after canceling", async () => {
  const user = userEvent.setup();
  renderShell();
  const trigger = await screen.findByRole("button", { name: "Add to Vault" });
  await user.click(trigger);
  await user.click(screen.getByRole("menuitem", { name: "New folder" }));
  await screen.findByRole("textbox", { name: "Folder name" });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("renames from the displayed title and preserves the file extension", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByText("Copper MVP"));
  await user.click(
    within(screen.getByRole("heading", { name: "copper" })).getByRole("button"),
  );
  const title = await screen.findByRole("textbox", { name: "Note title" });
  await user.clear(title);
  await user.type(title, "My research{Enter}");
  await waitFor(() =>
    expect(mocks.renameFile).toHaveBeenCalledWith(
      "demo",
      "Inbox/copper.md",
      "Inbox/My research.md",
    ),
  );
  expect(
    await screen.findByRole("heading", { name: "My research" }),
  ).toBeVisible();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Rename note" })).toHaveFocus(),
  );
});

it("creates an empty note body without inserting another title heading", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByRole("button", { name: "New note" }));
  await waitFor(() =>
    expect(mocks.createFile).toHaveBeenCalledWith("demo", "Untitled.md", ""),
  );
});

it("offers actions for the right-clicked note without changing the active note", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByText("Copper MVP"));
  await user.pointer({
    keys: "[MouseRight]",
    target: await screen.findByText("Architecture"),
  });
  expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeVisible();
  await user.click(screen.getByRole("menuitem", { name: "Rename" }));
  const name = await screen.findByRole("textbox", { name: "File name" });
  await user.clear(name);
  await user.type(name, "System design{Enter}");
  await waitFor(() =>
    expect(mocks.renameFile).toHaveBeenCalledWith(
      "demo",
      "Projects/architecture.md",
      "Projects/System design.md",
    ),
  );
  expect(screen.getByRole("heading", { name: "copper" })).toBeVisible();
});

it("creates nested folders through the same file-tree dialog", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.pointer({
    keys: "[MouseRight]",
    target: await screen.findByRole("treeitem", { name: "Projects" }),
  });
  await user.click(screen.getByRole("menuitem", { name: "New folder" }));
  await user.type(
    await screen.findByRole("textbox", { name: "Folder name" }),
    "research{Enter}",
  );
  await waitFor(() =>
    expect(mocks.createFolder).toHaveBeenCalledWith(
      "demo",
      "Projects/research",
    ),
  );
});

it("keeps a failed title rename and unsaved body available for retry", async () => {
  mocks.saveFile.mockRejectedValueOnce(new Error("Disk is full"));
  const user = userEvent.setup();
  renderShell({ realEditor: true });
  await user.click(await screen.findByText("Copper MVP"));
  const editor = await screen.findByRole("textbox", {
    name: "Markdown editor",
  });
  const view = EditorView.findFromDOM(editor);
  act(() =>
    view?.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: "My unsaved body",
      },
    }),
  );
  await user.click(screen.getByRole("button", { name: "Rename note" }));
  const title = screen.getByRole("textbox", { name: "Note title" });
  await user.clear(title);
  await user.type(title, "Research.v1{Enter}");
  expect(
    await screen.findByText("Disk is full", {
      selector: ".copper-title-error",
    }),
  ).toHaveAttribute("role", "alert");
  expect(title).toHaveValue("Research.v1");
  expect(editor).toHaveTextContent("My unsaved body");
  expect(mocks.renameFile).not.toHaveBeenCalled();
  await user.type(title, "{Enter}");
  await waitFor(() =>
    expect(mocks.renameFile).toHaveBeenCalledWith(
      "demo",
      "Inbox/copper.md",
      "Inbox/Research.v1.md",
    ),
  );
  expect(mocks.saveFile).toHaveBeenCalledWith(
    "demo",
    "Inbox/copper.md",
    "My unsaved body",
    "revision",
  );
});

it("cancels a title edit without renaming the file", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByText("Copper MVP"));
  await user.click(screen.getByRole("button", { name: "Rename note" }));
  const title = screen.getByRole("textbox", { name: "Note title" });
  await user.clear(title);
  await user.type(title, "Changed{Escape}");
  expect(screen.getByRole("heading", { name: "copper" })).toBeVisible();
  expect(mocks.renameFile).not.toHaveBeenCalled();
});

it("keeps the rename dialog open when a destination already exists", async () => {
  mocks.renameFile.mockRejectedValueOnce(
    new Error("Destination already exists"),
  );
  const user = userEvent.setup();
  renderShell();
  await user.pointer({
    keys: "[MouseRight]",
    target: await screen.findByText("Architecture"),
  });
  await user.click(screen.getByRole("menuitem", { name: "Rename" }));
  const field = screen.getByRole("textbox", { name: "File name" });
  await user.clear(field);
  await user.type(field, "Existing{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Destination already exists",
  );
  expect(field).toHaveValue("Existing");
});

it("archives the context-menu target and keeps another note active", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByText("Copper MVP"));
  await user.pointer({
    keys: "[MouseRight]",
    target: await screen.findByText("Architecture"),
  });
  await user.click(screen.getByRole("menuitem", { name: "Archive" }));
  await waitFor(() =>
    expect(mocks.archiveFile).toHaveBeenCalledWith(
      "demo",
      "Projects/architecture.md",
    ),
  );
  expect(screen.getByRole("heading", { name: "copper" })).toBeVisible();
});

it("provides the shared actions on pinned notes", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByText("Copper MVP"));
  await user.click(screen.getByRole("button", { name: "Favorite note" }));
  await user.pointer({
    keys: "[MouseRight]",
    target: within(screen.getByLabelText("Vault navigation")).getByText(
      "copper.md",
    ),
  });
  expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeVisible();
  expect(
    screen.getByRole("menuitem", { name: "Move to Trash…" }),
  ).toBeVisible();
});

it("keeps folder errors in the dialog without losing its name", async () => {
  mocks.createFolder.mockRejectedValueOnce(new Error("Permission denied"));
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByRole("button", { name: "Add to Vault" }));
  await user.click(screen.getByRole("menuitem", { name: "New folder" }));
  const field = screen.getByRole("textbox", { name: "Folder name" });
  await user.type(field, "research{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Permission denied",
  );
  expect(field).toHaveValue("research");
});
