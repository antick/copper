import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAppShellMocks,
  renderShell,
  resetAppShellMocks,
  uniqueNotePathForTest,
} from "@/components/shell/app-shell-test-harness";

const mocks = getAppShellMocks();
beforeEach(resetAppShellMocks);

describe("AppShell workspace workflows", () => {
  it("persists note-list visibility and removes a collapsed sidebar from the pane grid", async () => {
    const user = userEvent.setup();
    renderShell();

    await screen.findByLabelText("Vault navigation");
    const editor = screen.getByLabelText("Editor");
    await user.click(
      within(editor).getByRole("button", { name: "Hide note list" }),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("Note list")).not.toBeInTheDocument(),
    );
    expect(mocks.navigationLayout).toBe("tree");
    expect(
      within(editor).getByRole("button", { name: "Show note list" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide left sidebar" }));
    expect(screen.queryByLabelText("Vault navigation")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Show left sidebar" }),
    ).toHaveLength(1);
    expect(document.querySelector(".copper-pane-left")).toBeNull();
    expect(
      document.querySelectorAll(".copper-panes > .copper-resizer"),
    ).toHaveLength(0);
  });

  it("gates Markdown-only chrome for source files and keeps exact filenames", async () => {
    const user = userEvent.setup();
    mocks.navigationLayout = "tree";
    renderShell();

    await user.click(await screen.findByRole("treeitem", { name: "app.ts" }));
    const editor = screen.getByLabelText("Editor");
    expect(within(editor).getByRole("tab")).toHaveTextContent("app.ts");
    expect(
      editor
        .querySelector(".copper-header-row")
        ?.contains(within(editor).getByRole("tablist")),
    ).toBe(true);
    expect(editor.querySelector(".copper-crumb")).toBeNull();
    expect(editor.querySelector(".copper-save-indicator")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Favorite note" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Toggle source" }),
    ).not.toBeInTheDocument();
    expect(within(editor).getByRole("heading", { name: "app" })).toBeVisible();
    expect(screen.queryByLabelText("Properties")).not.toBeInTheDocument();
    expect(screen.queryByText("Copy wikilink")).not.toBeInTheDocument();
  });

  it("clears folder scope when returning to All Notes", async () => {
    const user = userEvent.setup();
    renderShell();

    const projects = await screen.findByText("Projects");
    await user.click(projects);
    expect(screen.getByLabelText("Note list")).toHaveAccessibleName(
      "Note list",
    );
    expect(document.querySelector(".copper-pane-title")).toHaveTextContent(
      "Projects",
    );
    expect(screen.queryByText("Copper MVP")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /All Notes/ }));
    expect(document.querySelector(".copper-pane-title")).toHaveTextContent(
      "All Notes",
    );
    expect(await screen.findByText("Copper MVP")).toBeInTheDocument();
    expect(projects.closest("[role=treeitem]")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("keeps root creation available when the Vault is empty", async () => {
    const user = userEvent.setup();
    mocks.emptyTree = true;
    renderShell();

    expect(await screen.findByText("This Vault is empty.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add to Vault" }));
    await user.click(screen.getByRole("menuitem", { name: "New note" }));
    expect(mocks.createFile).toHaveBeenCalledWith(
      "demo",
      "Untitled.md",
      "# Untitled\n",
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("Projects");
    await user.click(screen.getByRole("button", { name: "Add to Vault" }));
    await user.click(screen.getByRole("menuitem", { name: "New folder" }));
    expect(mocks.createFolder).toHaveBeenCalledWith("demo", "Projects");
  });

  it("creates a collision-safe note in the selected ordinary folder", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByText("Projects"));

    await user.click(screen.getByRole("button", { name: "Add to Vault" }));
    await user.click(screen.getByRole("menuitem", { name: "New note" }));
    expect(mocks.createFile).toHaveBeenCalledWith(
      "demo",
      "Untitled.md",
      "# Untitled\n",
    );

    await user.click(screen.getByRole("button", { name: "New note" }));
    expect(mocks.createFile).toHaveBeenCalledWith(
      "demo",
      "Projects/Untitled.md",
      "# Untitled\n",
    );
  });

  it("chooses deterministic root and folder note paths", () => {
    const existing = new Set([
      "Untitled.md",
      "Untitled 2.md",
      "Projects/Untitled.md",
    ]);
    expect(uniqueNotePathForTest(existing)).toBe("Untitled 3.md");
    expect(uniqueNotePathForTest(existing, "Projects")).toBe(
      "Projects/Untitled 2.md",
    );
  });

  it("keeps Git publish as the leading status-bar control", async () => {
    mocks.gitStatus = {
      kind: "git",
      branch: "main",
      host: "github",
      dirtyCount: 2,
      ahead: 0,
      behind: 0,
      noteCount: 2,
      paths: ["a.md", "b.md"],
      blockReason: null,
    };
    renderShell();
    const status = await screen.findByRole("contentinfo");
    const git = await screen.findByRole("button", {
      name: "Review 2 Git changes",
    });
    expect(status.contains(git)).toBe(true);
    expect(status.firstElementChild).toBe(git);
    expect(status).not.toHaveTextContent("Demo Vault");
    expect(
      within(screen.getByLabelText("Editor")).queryByRole("button", {
        name: "Up to date",
      }),
    ).toBeNull();
  });

  it("shows a document title, pinned filenames, and an instant settings overlay", async () => {
    const user = userEvent.setup();
    renderShell();
    const navigation = await screen.findByLabelText("Vault navigation");
    await user.click(await screen.findByText("Copper MVP"));
    const editor = screen.getByLabelText("Editor");
    expect(
      within(editor).getByRole("heading", { name: "copper" }),
    ).toBeVisible();
    expect(
      within(editor).queryByRole("button", { name: "Toggle source" }),
    ).toBeNull();
    await user.click(
      within(editor).getByRole("button", { name: "Favorite note" }),
    );
    expect(within(navigation).getByText("copper.md")).toBeVisible();
    await user.click(
      within(navigation).getByRole("button", { name: /Favorites/ }),
    );
    expect(await screen.findByText("Copper MVP")).toBeInTheDocument();
    await user.click(
      within(editor).getByRole("button", { name: "More file actions" }),
    );
    expect(screen.getByRole("menuitem", { name: "Show source" })).toBeVisible();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Open settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Open settings" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Appearance" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Editor")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to notes" }));
    expect(
      screen.queryByRole("heading", { name: "Settings" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Editor")).toBeInTheDocument();
  });

  it("switches the rail to Tasks without adding Git or AI chrome", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Notes", { selector: ".copper-vault-name" });
    await user.click(screen.getByRole("button", { name: "Tasks" }));
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      await screen.findByRole("button", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".copper-title-region")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Hide left sidebar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fast board")).toBeInTheDocument();
    expect(screen.queryByText(/Claude/i)).toBeNull();
    expect(
      document.querySelector("[data-workspace-mode='tasks']"),
    ).not.toBeNull();
    expect(
      screen.getByText("Tasks", { selector: ".copper-vault-name" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show list" }));
    expect(screen.getByRole("cell", { name: "COPP-1" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Filter: Any status/ }),
    ).toBeInTheDocument();
  });

  it("opens a Tasks file as a note and switches only from Open in Tasks", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Notes", { selector: ".copper-vault-name" });
    await user.click(screen.getByText("Fast board"));
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Open in Tasks" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open in Tasks" }));
    expect(
      screen.getByRole("button", { name: "Tasks", hidden: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByLabelText("Issue title")).toHaveValue(
      "Fast board",
    );
  });

  it("does not show fake Git, AI, or Contribute chrome without Vault-root Git", async () => {
    renderShell();
    await screen.findByText("Notes", { selector: ".copper-vault-name" });
    expect(screen.queryByRole("button", { name: /Push/i })).toBeNull();
    expect(screen.queryByText(/GitHub/i)).toBeNull();
    expect(screen.queryByText(/Contribute/i)).toBeNull();
    expect(screen.queryByText(/Claude/i)).toBeNull();
    expect(screen.queryByText(/branch/i)).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "More file actions" }),
    );
    expect(screen.queryByRole("menuitem", { name: /Git|Push/i })).toBeNull();
    expect(
      screen.getByRole("menuitem", { name: "Rename file" }),
    ).toBeInTheDocument();
  });
});
