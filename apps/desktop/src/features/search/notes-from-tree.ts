import type { FileTreeNode } from "@/features/file-tree/types";
import type { SearchHit } from "@/lib/copper/search";

export function collectMarkdownNotes(root?: FileTreeNode): SearchHit[] {
  const notes: SearchHit[] = [];
  if (!root) {
    return notes;
  }
  function walk(node: FileTreeNode) {
    if (
      node.kind === "file" &&
      (node.fileKind === "markdown" ||
        (!node.fileKind && /\.(md|markdown)$/i.test(node.name)))
    ) {
      notes.push({
        path: node.path,
        title: node.name.replace(/\.md$/i, "").replace(/\.markdown$/i, ""),
        snippet: "",
        tags: [],
        mtimeNs: 0,
      });
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
  if (root.path) {
    walk(root);
  } else {
    for (const child of root.children ?? []) {
      walk(child);
    }
  }
  return notes;
}

/**
 * Normalize the scope used by note-list query keys and path comparisons.
 *
 * Vault paths are case-sensitive, so only path punctuation and the special
 * all-notes sentinel are normalized here. Keeping the original path casing is
 * important for folders such as `Projects/Copper`.
 */
export function normalizeScope(scope?: string | null): string {
  const normalized = (scope ?? "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
  return !normalized || normalized.toLowerCase() === "all" ? "all" : normalized;
}

export function isArchivedPath(path: string): boolean {
  return path === "Archive" || path.startsWith("Archive/");
}

export function notesInScope(
  notes: SearchHit[],
  scope?: string | null,
): SearchHit[] {
  const normalizedScope = normalizeScope(scope);
  if (normalizedScope === "all") {
    return notes.filter((note) => !isArchivedPath(note.path));
  }
  if (normalizedScope === "Archive") {
    return notes.filter((note) => isArchivedPath(note.path));
  }
  return notes.filter(
    (note) =>
      !isArchivedPath(note.path) &&
      (note.path === normalizedScope ||
        note.path.startsWith(`${normalizedScope}/`)),
  );
}

export function mergeIndexedNotes(
  fromTree: SearchHit[],
  indexed: SearchHit[] | undefined,
  scope?: string | null,
): SearchHit[] {
  const scopedTree =
    scope === undefined ? fromTree : notesInScope(fromTree, scope);
  const scopedIndexed =
    scope === undefined ? (indexed ?? []) : notesInScope(indexed ?? [], scope);
  if (!scopedIndexed.length) {
    return scopedTree;
  }
  const byPath = new Map(scopedIndexed.map((note) => [note.path, note]));
  const merged = scopedTree.map((note) => byPath.get(note.path) ?? note);
  const treePaths = new Set(scopedTree.map((note) => note.path));
  for (const note of scopedIndexed) {
    if (!treePaths.has(note.path)) merged.push(note);
  }
  return merged;
}

export function favoriteHits(paths: string[], notes: SearchHit[]): SearchHit[] {
  const byPath = new Map(notes.map((note) => [note.path, note]));
  return paths
    .filter((path) => !isArchivedPath(path))
    .map((path) => {
      const hit = byPath.get(path);
      if (hit) {
        return hit;
      }
      const name = path.split("/").at(-1) ?? path;
      return {
        path,
        title: name.replace(/\.md$/i, "").replace(/\.markdown$/i, ""),
        snippet: "",
        tags: [],
        mtimeNs: 0,
      };
    });
}
