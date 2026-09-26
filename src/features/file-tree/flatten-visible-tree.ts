import type { FileTreeNode, VisibleTreeRow } from "@/features/file-tree/types";

export function flattenVisibleTree(
  root: FileTreeNode,
  expanded: ReadonlySet<string>,
  includeFiles = true,
): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = [];

  function walk(nodes: FileTreeNode[] | undefined, depth: number) {
    if (!nodes) {
      return;
    }
    for (const node of nodes) {
      const isFolder = node.kind === "directory";
      if (!includeFiles && !isFolder) {
        continue;
      }
      const isExpanded = isFolder && expanded.has(node.path);
      rows.push({ node, depth, expanded: isExpanded });
      if (isFolder && isExpanded) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(root.children, 0);
  return rows;
}
