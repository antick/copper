import { EditorView } from "@codemirror/view";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAppShellMocks,
  renderShell,
  resetAppShellMocks,
} from "@/components/shell/app-shell-test-harness";

const mocks = getAppShellMocks();
beforeEach(resetAppShellMocks);

describe("AppShell", () => {
  it("does not overwrite task session state before restoration", async () => {
    let restore: ((session: Record<string, unknown>) => void) | undefined;
    mocks.loadSession.mockReturnValueOnce(
      new Promise((resolve) => {
        restore = resolve;
      }),
    );
    renderShell();

    await new Promise((resolve) => window.setTimeout(resolve, 300));
    expect(mocks.saveSession).not.toHaveBeenCalled();

    restore?.({
      tabs: [],
      activePath: null,
      leftCollapsed: false,
      rightCollapsed: false,
      favorites: [],
      workspaceMode: "tasks",
      tasksProjectOrder: ["copper"],
      tasksPinnedProjects: ["copper"],
      tasksListColumnWidths: { title: 344 },
    });
    await waitFor(() => expect(mocks.saveSession).toHaveBeenCalled());
    expect(mocks.saveSession).toHaveBeenLastCalledWith(
      "demo",
      expect.objectContaining({
        tasksProjectOrder: ["copper"],
        tasksPinnedProjects: ["copper"],
        tasksListColumnWidths: { title: 344 },
      }),
    );
  });

  it("shows a folder-only tree beside the contextual note list", async () => {
    const { container } = renderShell();
    const navigation = await screen.findByLabelText("Vault navigation");
    expect(container.querySelector(".copper-window-drag-lane")).toHaveAttribute(
      "data-copper-drag-region",
    );
    expect(screen.getAllByRole("separator")[0]).toHaveAttribute(
      "data-line-below-header",
      "true",
    );

    expect(
      screen.getByRole("button", { name: "Hide left sidebar" }),
    ).toBeInTheDocument();
    expect(navigation).toHaveTextContent("All Notes");
    expect(navigation).toHaveTextContent("Favorites");
    expect(navigation).toHaveTextContent("Pinned");
    expect(navigation).toHaveTextContent("Folders");
    expect(
      within(navigation).queryByRole("button", { name: /^Archive$/ }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Open settings" }),
    ).toBeInTheDocument();
    expect(navigation.querySelector(".copper-vault-name")).toHaveTextContent(
      "Notes",
    );
    expect(within(navigation).getAllByText("Inbox")).toHaveLength(1);
    const tree = screen.getByRole("tree", { name: "Vault folders" });
    expect(tree).toBeVisible();
    expect(within(tree).queryByText("Demo Vault")).not.toBeInTheDocument();
    const status = document.querySelector(".copper-status-bar");
    expect(status).not.toHaveTextContent("Demo Vault");
    expect(status).not.toHaveTextContent("0.1.0");
    expect(status).not.toHaveTextContent("Live Preview");
    expect(status).not.toHaveTextContent("Source");
    expect(
      within(tree).getByText("Inbox").closest("[role=treeitem]"),
    ).toHaveAttribute("aria-level", "1");
    expect(within(tree).queryByText("root-note.md")).not.toBeInTheDocument();
    expect(await screen.findByText("Copper MVP")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("root-note")).toBeInTheDocument();
    expect(screen.getByLabelText("Note list")).toBeVisible();
    expect(container.querySelector(".copper-shell")).toHaveAttribute(
      "data-navigation-layout",
      "note-list",
    );
    expect(
      within(navigation).getByRole("button", { name: "Hide left sidebar" }),
    ).toBeInTheDocument();
    expect(
      within(navigation).queryByRole("button", { name: "Hide note list" }),
    ).not.toBeInTheDocument();
    expect(
      within(navigation).queryByRole("button", { name: "Search Vault" }),
    ).not.toBeInTheDocument();
    expect(
      within(navigation).queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
    const editor = screen.getByLabelText("Editor");
    expect(
      within(editor).getByRole("button", { name: "Hide note list" }),
    ).toBeInTheDocument();
    expect(
      within(editor).getByRole("button", { name: "Search Vault" }),
    ).toBeInTheDocument();
    const header = editor.querySelector(".copper-header-row");
    expect(header?.contains(within(editor).getByRole("tablist"))).toBe(true);
    expect(editor.querySelector(".copper-crumb")).toBeNull();
    expect(editor.querySelectorAll(".copper-header-row")).toHaveLength(1);
  });

  it("shows files in the tree and uses transient search in tree mode", async () => {
    const user = userEvent.setup();
    mocks.navigationLayout = "tree";
    const { container } = renderShell();

    expect(
      await screen.findByRole("tree", { name: "Vault files and folders" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("treeitem", { name: "root-note.md" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("tree", { name: "Vault files and folders" }),
      ).queryByText("Demo Vault"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Note list")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Search Vault" }));
    expect(screen.getByRole("dialog", { name: "Search Vault" })).toBeVisible();
    expect(screen.queryByLabelText("Note list")).not.toBeInTheDocument();
    expect(container.querySelector(".copper-shell")).toHaveAttribute(
      "data-navigation-layout",
      "tree",
    );
  });

  it("replaces one preview tab, pins on double-click, and preserves pinned tabs", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByText("Copper MVP"));
    const editor = screen.getByLabelText("Editor");
    let tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveAttribute("data-preview", "true");
    expect(editor.querySelector(".copper-header-row")?.contains(tabs[0])).toBe(
      true,
    );
    expect(editor.querySelector(".copper-save-indicator")).toBeNull();
    expect(editor.querySelectorAll(".copper-header-row")).toHaveLength(1);

    await user.click(screen.getByText("Architecture"));
    tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveTextContent("architecture.md");

    await user.dblClick(screen.getByText("Architecture"));
    expect(screen.getByRole("tab")).toHaveAttribute("data-preview", "false");

    await user.click(screen.getByText("Copper MVP"));
    tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent("architecture.md");
    expect(tabs[1]).toHaveAttribute("data-preview", "true");

    await user.click(screen.getByText("Editor body"));
    expect(tabs[1]).toHaveAttribute("data-preview", "false");

    tabs[1].focus();
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(screen.getAllByRole("tab")[0]).toHaveTextContent("copper.md");
    await waitFor(() =>
      expect(mocks.saveSession).toHaveBeenLastCalledWith(
        "demo",
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({ path: "Inbox/copper.md" }),
          ]),
        }),
      ),
    );
  });

  it("flushes pending edits before switching away and keeps tab paths unique", async () => {
    const user = userEvent.setup();
    renderShell({ realEditor: true });

    await user.click(await screen.findByText("Copper MVP"));
    const host = await screen.findByTestId("copper-editor");
    const editor = host.querySelector(".cm-editor");
    expect(editor).not.toBeNull();
    const view = EditorView.findFromDOM(editor as HTMLElement);
    if (!view) throw new Error("CodeMirror view was not mounted");
    view.dispatch({
      changes: { from: view.state.doc.length, insert: "Edited before switch" },
    });

    await user.click(screen.getByText("Architecture"));
    await waitFor(() => {
      expect(mocks.saveFile).toHaveBeenCalledWith(
        "demo",
        "Inbox/copper.md",
        expect.stringContaining("Edited before switch"),
      );
    });
    const labels = screen
      .getAllByRole("tab")
      .map((tab) => tab.textContent?.replace("Close", ""));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("uses one Properties affordance in the correct header", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    await user.click(await screen.findByText("Copper MVP"));
    expect(
      await screen.findByRole("button", { name: "Close properties" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show properties" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close properties" }));
    expect(container.querySelector(".copper-shell")).toHaveAttribute(
      "data-right-collapsed",
      "true",
    );
    const show = screen.getByRole("button", { name: "Show properties" });
    expect(show).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Show properties" }),
    ).toHaveLength(1);

    const more = screen.getByRole("button", { name: "More file actions" });
    expect(
      more.compareDocumentPosition(show) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.click(show);
    expect(
      screen.getByRole("button", { name: "Close properties" }),
    ).toBeVisible();
  });

  it("flushes edits before archive, then restores and trashes contextually", async () => {
    const user = userEvent.setup();
    renderShell({ realEditor: true });
    await user.click(await screen.findByText("Copper MVP"));
    const host = await screen.findByTestId("copper-editor");
    const editor = host.querySelector(".cm-editor");
    const view = editor ? EditorView.findFromDOM(editor as HTMLElement) : null;
    if (!view) throw new Error("CodeMirror view was not mounted");
    view.dispatch({
      changes: { from: view.state.doc.length, insert: "edited before archive" },
    });

    await user.click(screen.getByRole("button", { name: "More file actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    await waitFor(() =>
      expect(mocks.archiveFile).toHaveBeenCalledWith("demo", "Inbox/copper.md"),
    );
    expect(mocks.saveFile).toHaveBeenCalledWith(
      "demo",
      "Inbox/copper.md",
      expect.stringContaining("edited before archive"),
    );
    expect(mocks.saveFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.archiveFile.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(screen.getByRole("tab")).toHaveTextContent("copper.md");

    await user.click(screen.getByRole("button", { name: "More file actions" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Restore from Archive" }),
    );
    await waitFor(() =>
      expect(mocks.restoreFile).toHaveBeenCalledWith(
        "demo",
        "Archive/Inbox/copper.md",
      ),
    );

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "More file actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Move to Trash…" }));
    expect(mocks.trashFile).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "More file actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Move to Trash…" }));
    await waitFor(() =>
      expect(mocks.trashFile).toHaveBeenCalledWith("demo", "Inbox/copper.md"),
    );
    confirm.mockRestore();
  });
});
