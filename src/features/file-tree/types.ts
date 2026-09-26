export type SupportedFileKind = "markdown" | "text" | "code" | "data" | "image";

export interface FileTreeNode {
  name: string;
  path: string;
  kind: "file" | "directory" | string;
  fileKind?: SupportedFileKind;
  typeLabel?: string;
  children?: FileTreeNode[];
}

export function findFileNode(
  root: FileTreeNode | undefined,
  path: string | undefined,
): FileTreeNode | undefined {
  if (!root || !path) return undefined;
  if (root.path === path) return root;
  for (const child of root.children ?? []) {
    const found = findFileNode(child, path);
    if (found) return found;
  }
  return undefined;
}

export function collectSupportedFilePaths(root?: FileTreeNode): string[] {
  if (!root) return [];
  const paths: string[] = [];
  function walk(node: FileTreeNode) {
    if (node.kind === "file") paths.push(node.path);
    for (const child of node.children ?? []) walk(child);
  }
  walk(root);
  return paths;
}

export interface VisibleTreeRow {
  node: FileTreeNode;
  depth: number;
  expanded: boolean;
}
