import { describe, expect, it } from "vitest";
import { flattenVisibleTree } from "@/features/file-tree/flatten-visible-tree";
import type { FileTreeNode } from "@/features/file-tree/types";

const tree: FileTreeNode = {
  name: "Vault",
  path: "",
  kind: "directory",
  children: [
    {
      name: "notes",
      path: "notes",
      kind: "directory",
      children: [
        {
          name: "daily",
          path: "notes/daily",
          kind: "directory",
          children: [
            { name: "today.md", path: "notes/daily/today.md", kind: "file" },
          ],
        },
      ],
    },
    { name: "readme.md", path: "readme.md", kind: "file" },
  ],
};

describe("flattenVisibleTree", () => {
  it("flattens only expanded folders", () => {
    const collapsed = flattenVisibleTree(tree, new Set());
    expect(collapsed.map((row) => row.node.path)).toEqual([
      "notes",
      "readme.md",
    ]);

    const expanded = flattenVisibleTree(
      tree,
      new Set(["notes", "notes/daily"]),
    );
    expect(expanded.map((row) => row.node.path)).toEqual([
      "notes",
      "notes/daily",
      "notes/daily/today.md",
      "readme.md",
    ]);
    expect(expanded[2]?.depth).toBe(2);
  });

  it("keeps nested folders but omits file rows in folder-only mode", () => {
    const folders = flattenVisibleTree(
      tree,
      new Set(["notes", "notes/daily"]),
      false,
    );
    expect(folders.map((row) => row.node.path)).toEqual([
      "notes",
      "notes/daily",
    ]);
    expect(folders.every((row) => row.node.kind === "directory")).toBe(true);
  });
});
