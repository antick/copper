import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { FileTree } from "@/features/file-tree/file-tree";
import {
  TREE_DEPTH_STEP,
  TREE_ROW_BASE_INSET,
  TREE_ROW_ICON_SIZE,
} from "@/features/file-tree/file-tree-row";
import type { FileTreeNode } from "@/features/file-tree/types";
import { LEFT_ROW_INSET } from "@/lib/left-pane-layout";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 26,
      })),
    getTotalSize: () => count * 26,
  }),
}));

vi.mock("@/lib/copper", () => ({
  copper: {
    files: {
      createFile: async () => undefined,
      createFolder: async () => undefined,
      rename: async (_vaultId: string, _from: string, to: string) => to,
      archive: async (_vaultId: string, path: string) => `Archive/${path}`,
      restore: async (_vaultId: string, path: string) =>
        path.replace(/^Archive\//, ""),
      trash: async () => undefined,
    },
    search: {
      indexFile: async () => undefined,
      removeIndexed: async () => undefined,
      indexVault: async () => 0,
    },
  },
}));

const tree: FileTreeNode = {
  name: "Vault",
  path: "",
  kind: "directory",
  children: [
    {
      name: "Inbox",
      path: "Inbox",
      kind: "directory",
      children: [
        {
          name: "capture.md",
          path: "Inbox/capture.md",
          kind: "file",
          fileKind: "markdown",
          typeLabel: "MD",
        },
      ],
    },
    {
      name: "javascript",
      path: "javascript",
      kind: "directory",
      children: [
        {
          name: "nodejs",
          path: "javascript/nodejs",
          kind: "directory",
          children: [
            {
              name: "README.md",
              path: "javascript/nodejs/README.md",
              kind: "file",
              fileKind: "markdown",
              typeLabel: "MD",
            },
          ],
        },
      ],
    },
    { name: "Empty", path: "Empty", kind: "directory", children: [] },
    {
      name: "root.md",
      path: "root.md",
      kind: "file",
      fileKind: "markdown",
      typeLabel: "MD",
    },
    {
      name: "app.ts",
      path: "app.ts",
      kind: "file",
      fileKind: "code",
      typeLabel: "TS",
    },
    {
      name: "config.json",
      path: "config.json",
      kind: "file",
      fileKind: "data",
      typeLabel: "JSON",
    },
    {
      name: "README",
      path: "README",
      kind: "file",
      fileKind: "text",
      typeLabel: "TXT",
    },
    {
      name: "photo.png",
      path: "photo.png",
      kind: "file",
      fileKind: "image",
      typeLabel: "PNG",
    },
    {
      name: "README.md.md",
      path: "README.md.md",
      kind: "file",
      fileKind: "markdown",
      typeLabel: "MD",
    },
  ],
};

function renderTree(props: ComponentProps<typeof FileTree>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FileTree {...props} />
    </QueryClientProvider>,
  );
}

function rowFor(name: string) {
  return screen.getByRole("treeitem", { name });
}

function rowIcon(name: string) {
  const icon = rowFor(name).querySelector(".copper-tree-icon");
  if (!(icon instanceof SVGElement)) {
    throw new Error(`Missing row icon for ${name}`);
  }
  return icon;
}

function expectFixedSlot(element: HTMLElement | SVGElement, size: number) {
  expect(element).toHaveStyle({
    width: `${size}px`,
    minWidth: `${size}px`,
    flexShrink: 0,
  });
}

describe("FileTree navigation modes", () => {
  it("renders real top-level folders without a synthetic Vault row", () => {
    renderTree({ tree, mode: "folders" });
    expect(screen.getByRole("tree", { name: "Vault folders" })).toBeVisible();
    expect(screen.queryByText("Vault")).not.toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(rowFor("Inbox")).toHaveAttribute("aria-level", "1");
    expect(screen.queryByText("capture.md")).not.toBeInTheDocument();
    expect(screen.queryByText("root.md")).not.toBeInTheDocument();
  });

  it("renders a consistent visible indent and aria level at every depth", async () => {
    const user = userEvent.setup();
    renderTree({ tree, mode: "tree" });

    const javascript = rowFor("javascript");
    const nodejs = rowFor("nodejs");
    await user.click(nodejs);
    const readme = rowFor("README.md");

    expect(TREE_ROW_BASE_INSET).toBe(LEFT_ROW_INSET);
    expect(javascript).toHaveStyle({ paddingLeft: TREE_ROW_BASE_INSET });
    expect(nodejs).toHaveStyle({
      paddingLeft: TREE_ROW_BASE_INSET + TREE_DEPTH_STEP,
    });
    expect(readme).toHaveStyle({
      paddingLeft: TREE_ROW_BASE_INSET + TREE_DEPTH_STEP * 2,
    });
    expect(javascript).toHaveAttribute("aria-level", "1");
    expect(nodejs).toHaveAttribute("aria-level", "2");
    expect(readme).toHaveAttribute("aria-level", "3");
  });

  it("aligns same-depth folder and file columns and keeps icon boxes from shrinking", async () => {
    const user = userEvent.setup();
    renderTree({ tree, mode: "tree" });

    for (const name of ["javascript", "Empty", "root.md"] as const) {
      expect(rowFor(name)).toHaveStyle({
        paddingLeft: TREE_ROW_BASE_INSET,
      });
      expectFixedSlot(rowIcon(name), TREE_ROW_ICON_SIZE);
      expect(rowIcon(name)).toHaveStyle({
        height: `${TREE_ROW_ICON_SIZE}px`,
      });
    }

    expect(
      within(rowFor("Empty")).queryByRole("button", {
        name: /folder/i,
      }),
    ).toBeNull();
    expect(
      rowFor("javascript").querySelector(".lucide-folder-open"),
    ).not.toBeNull();
    expect(rowFor("Empty").querySelector(".lucide-folder-open")).toBeNull();

    const nodejs = rowFor("nodejs");
    await user.click(nodejs);
    expectFixedSlot(rowIcon("README.md"), TREE_ROW_ICON_SIZE);
    expect(rowIcon("README.md")).toHaveStyle({
      height: `${TREE_ROW_ICON_SIZE}px`,
    });
  });

  it("selects and toggles a folder once for row, double-click, and Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTree({ tree, mode: "tree", onSelect });

    const javascript = rowFor("javascript");
    expect(screen.getByText("nodejs")).toBeVisible();
    expect(
      within(javascript).queryByRole("button", { name: /folder/i }),
    ).toBeNull();

    await user.click(javascript);
    expect(onSelect).toHaveBeenLastCalledWith("javascript", "directory");
    expect(screen.queryByText("nodejs")).not.toBeInTheDocument();
    expect(javascript.querySelector(".lucide-folder-open")).toBeNull();

    await user.dblClick(javascript);
    expect(screen.getByText("nodejs")).toBeVisible();
    expect(onSelect).toHaveBeenCalledTimes(2);

    await user.click(javascript);
    expect(screen.queryByText("nodejs")).not.toBeInTheDocument();

    const treeElement = screen.getByRole("tree", {
      name: "Vault files and folders",
    });
    fireEvent.keyDown(treeElement, { key: "Enter" });
    expect(screen.getByText("nodejs")).toBeVisible();
    expect(onSelect).toHaveBeenLastCalledWith("javascript", "directory");
  });

  it("keeps depth-zero keyboard focus on visible rows", () => {
    renderTree({ tree, mode: "tree" });
    const inbox = rowFor("Inbox");
    const treeElement = screen.getByRole("tree", {
      name: "Vault files and folders",
    });

    expect(inbox).toHaveAttribute("data-focused", "true");
    fireEvent.keyDown(treeElement, { key: "ArrowLeft" });
    expect(screen.queryByText("capture.md")).not.toBeInTheDocument();
    fireEvent.keyDown(treeElement, { key: "ArrowLeft" });
    expect(inbox).toHaveAttribute("data-focused", "true");
    expect(screen.queryByText("Vault")).not.toBeInTheDocument();
  });

  it("keeps rootless rows when the virtualized threshold is exceeded", () => {
    const largeTree: FileTreeNode = {
      name: "Large Vault",
      path: "",
      kind: "directory",
      children: Array.from({ length: 205 }, (_, index) => ({
        name: `note-${index}.md`,
        path: `note-${index}.md`,
        kind: "file" as const,
      })),
    };
    renderTree({ tree: largeTree, mode: "tree" });

    expect(screen.queryByText("Large Vault")).not.toBeInTheDocument();
    expect(rowFor("note-0.md")).toHaveAttribute("aria-level", "1");
    expect(rowFor("note-204.md")).toHaveAttribute("aria-level", "1");
  });

  it("selects empty folders without adding disclosure state", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderTree({ tree, mode: "tree", onSelect });

    const empty = rowFor("Empty");
    expect(empty).not.toHaveAttribute("aria-expanded");
    await user.click(empty);
    expect(onSelect).toHaveBeenCalledWith("Empty", "directory");
    expect(empty).not.toHaveAttribute("aria-expanded");
  });

  it("shows compact category badges only in the full tree", () => {
    renderTree({ tree, mode: "tree" });
    for (const label of ["MD", "TS", "JSON", "TXT", "PNG"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(rowFor("app.ts")).toHaveAccessibleName("app.ts");
  });

  it("hides redundant extensions from visible file names", () => {
    renderTree({ tree, mode: "tree" });
    expect(within(rowFor("root.md")).getByText("root")).toBeVisible();
    expect(within(rowFor("app.ts")).getByText("app")).toBeVisible();
    expect(within(rowFor("README.md.md")).getByText("README.md")).toBeVisible();
    expect(within(rowFor("README")).getByText("README")).toBeVisible();
    expect(within(rowFor("javascript")).getByText("javascript")).toBeVisible();
    expect(rowFor("root.md")).toHaveAccessibleName("root.md");
    expect(rowFor("README.md.md")).toHaveAccessibleName("README.md.md");
    expect(screen.queryByText("root.md")).not.toBeInTheDocument();
  });

  it("offers only valid Archive and Trash actions by item kind", async () => {
    const user = userEvent.setup();
    renderTree({ tree, mode: "tree", vaultId: "demo" });

    fireEvent.contextMenu(rowFor("root.md"));
    expect(
      await screen.findByRole("menuitem", { name: "Rename" }),
    ).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Move to Trash…" }),
    ).toBeVisible();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
    await user.keyboard("{Escape}");

    fireEvent.contextMenu(rowFor("Inbox"));
    expect(
      await screen.findByRole("menuitem", { name: "New note" }),
    ).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "New folder" })).toBeVisible();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).toBeNull();
  });

  it("previews files on click and pins them from double-click and Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onPinFile = vi.fn();
    renderTree({
      tree,
      mode: "tree",
      selectedPath: "root.md",
      onSelect,
      onPinFile,
    });

    const file = rowFor("root.md");
    await user.click(file);
    expect(onSelect).toHaveBeenLastCalledWith("root.md", "file");

    await user.dblClick(file);
    expect(onPinFile).toHaveBeenCalledWith("root.md");

    const treeElement = screen.getByRole("tree", {
      name: "Vault files and folders",
    });
    fireEvent.keyDown(treeElement, { key: "Enter" });
    expect(onPinFile).toHaveBeenLastCalledWith("root.md");
  });
});
