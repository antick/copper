import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { FileTreeContextMenu } from "@/features/file-tree/file-tree-menu";
import { FileTreeRow } from "@/features/file-tree/file-tree-row";
import { flattenVisibleTree } from "@/features/file-tree/flatten-visible-tree";
import { useFileMutations } from "@/features/file-tree/mutations";
import type { FileTreeNode, VisibleTreeRow } from "@/features/file-tree/types";

const VIRTUALIZE_AFTER = 200;

export function FileTree({
  tree,
  selectedPath,
  onSelect,
  onPinFile,
  mode = "tree",
  vaultId,
  onFileCreated,
  onPathRenamed,
  onPathRemoved,
  onBeforeFileOperation,
}: {
  tree: FileTreeNode;
  selectedPath?: string;
  onSelect?: (path: string, kind: string) => void;
  onPinFile?: (path: string) => void;
  mode?: "folders" | "tree";
  vaultId?: string;
  onFileCreated?: (path: string) => void;
  onPathRenamed?: (from: string, to: string) => void;
  onPathRemoved?: (path: string) => void;
  onBeforeFileOperation?: () => Promise<void>;
}) {
  const mutations = useFileMutations(vaultId);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const next = new Set<string>();
    for (const child of tree.children ?? []) {
      if (child.kind === "directory" && child.children?.length) {
        next.add(child.path);
      }
    }
    return next;
  });
  const [focusedPath, setFocusedPath] = useState<string | undefined>(() =>
    selectedPath && selectedPath.length > 0
      ? selectedPath
      : tree.children?.find(
          (child) => mode === "tree" || child.kind === "directory",
        )?.path,
  );
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () => flattenVisibleTree(tree, expanded, mode === "tree"),
    [tree, expanded, mode],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    enabled: rows.length > VIRTUALIZE_AFTER,
  });

  async function prepareFileOperation() {
    try {
      await onBeforeFileOperation?.();
      return true;
    } catch (error) {
      window.alert(
        error instanceof Error
          ? `Couldn’t save the active file: ${error.message}`
          : "Couldn’t save the active file.",
      );
      return false;
    }
  }

  function toggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function move(delta: number) {
    const index = rows.findIndex((row) => row.node.path === focusedPath);
    const nextIndex =
      index < 0
        ? delta > 0
          ? 0
          : rows.length - 1
        : Math.max(0, Math.min(rows.length - 1, index + delta));
    const next = rows[nextIndex];
    if (next) {
      setFocusedPath(next.node.path);
    }
  }

  function requestNewNote(folder: string) {
    const requested = window.prompt("New note name", "Untitled.md")?.trim();
    if (!requested) return;
    const name = /\.md$/i.test(requested) ? requested : `${requested}.md`;
    const path = folder ? `${folder}/${name}` : name;
    mutations.createFile.mutate(path, {
      onSuccess: () => onFileCreated?.(path),
      onError: (error) =>
        window.alert(
          error instanceof Error ? error.message : "Couldn’t create the note.",
        ),
    });
  }

  function requestNewFolder(folder: string) {
    const name = window.prompt("New folder name", "folder");
    if (!name) {
      return;
    }
    mutations.createFolder.mutate(folder ? `${folder}/${name}` : name);
  }

  async function requestRename(node: FileTreeNode) {
    const slash = node.path.lastIndexOf("/");
    const parent = slash >= 0 ? node.path.slice(0, slash + 1) : "";
    const currentName = node.path.slice(slash + 1);
    const requested = window.prompt("Rename to", currentName)?.trim();
    if (!requested || requested === currentName) return;
    const next = `${parent}${requested}`;
    if (!(await prepareFileOperation())) return;
    mutations.rename.mutate(
      {
        from: node.path,
        to: next,
        kind: node.kind,
        fileKind: node.fileKind,
      },
      {
        onSuccess: () => onPathRenamed?.(node.path, next),
        onError: (error) =>
          window.alert(
            error instanceof Error
              ? error.message
              : "Couldn’t rename the item.",
          ),
      },
    );
  }

  async function requestTrash(node: FileTreeNode) {
    if (!window.confirm(`Move “${node.name}” to the system Trash?`)) {
      return;
    }
    if (!(await prepareFileOperation())) return;
    mutations.trash.mutate(
      { path: node.path, kind: node.kind, fileKind: node.fileKind },
      {
        onSuccess: () => onPathRemoved?.(node.path),
        onError: (error) =>
          window.alert(
            error instanceof Error
              ? error.message
              : "Couldn’t move the item to Trash.",
          ),
      },
    );
  }

  async function requestArchive(node: FileTreeNode, restore = false) {
    if (!(await prepareFileOperation())) return;
    const mutation = restore ? mutations.restore : mutations.archive;
    mutation.mutate(node.path, {
      onSuccess: (next) => onPathRenamed?.(node.path, next),
      onError: (error) =>
        window.alert(
          error instanceof Error
            ? error.message
            : `Couldn’t ${restore ? "restore" : "archive"} the note.`,
        ),
    });
  }

  function renderRow(row: VisibleTreeRow) {
    return (
      <FileTreeContextMenu
        key={row.node.path}
        isFolder={row.node.kind === "directory"}
        isRoot={row.node.path === ""}
        fileKind={row.node.fileKind}
        archived={row.node.path.startsWith("Archive/")}
        onNewNote={() => requestNewNote(row.node.path)}
        onNewFolder={() => requestNewFolder(row.node.path)}
        onRename={() => void requestRename(row.node)}
        onArchive={() => void requestArchive(row.node)}
        onRestore={() => void requestArchive(row.node, true)}
        onTrash={() => void requestTrash(row.node)}
      >
        <FileTreeRow
          row={row}
          selected={selectedPath === row.node.path}
          focused={focusedPath === row.node.path}
          onSelect={() => {
            setFocusedPath(row.node.path);
            onSelect?.(row.node.path, row.node.kind);
          }}
          onToggle={() => toggle(row.node.path)}
          onPinFile={() => onPinFile?.(row.node.path)}
        />
      </FileTreeContextMenu>
    );
  }

  const rendered =
    rows.length > VIRTUALIZE_AFTER
      ? virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          if (!row) {
            return null;
          }
          return (
            <div
              key={row.node.path}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start}px)`,
              }}
            >
              {renderRow(row)}
            </div>
          );
        })
      : rows.map((row) => renderRow(row));

  return (
    <div
      ref={parentRef}
      role="tree"
      aria-label={mode === "tree" ? "Vault files and folders" : "Vault folders"}
      className="copper-file-tree"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "ArrowRight" && focusedPath) {
          const index = rows.findIndex((row) => row.node.path === focusedPath);
          const row = rows[index];
          if (row?.node.kind === "directory" && row.node.children?.length) {
            event.preventDefault();
            if (!row.expanded) toggle(focusedPath);
            else if (rows[index + 1]?.depth === row.depth + 1) {
              setFocusedPath(rows[index + 1]?.node.path);
            }
          }
        } else if (event.key === "ArrowLeft" && focusedPath) {
          const index = rows.findIndex((row) => row.node.path === focusedPath);
          const row = rows[index];
          if (row) {
            event.preventDefault();
            if (row.node.kind === "directory" && row.expanded) {
              setExpanded((current) => {
                const next = new Set(current);
                next.delete(focusedPath);
                return next;
              });
            } else {
              const parent = rows
                .slice(0, index)
                .reverse()
                .find((candidate) => candidate.depth < row.depth);
              setFocusedPath(parent?.node.path ?? focusedPath);
            }
          }
        } else if (event.key === "F2" && focusedPath) {
          const row = rows.find((item) => item.node.path === focusedPath);
          if (row?.node.path) {
            event.preventDefault();
            void requestRename(row.node);
          }
        } else if (event.key === "Enter" && focusedPath) {
          const row = rows.find((item) => item.node.path === focusedPath);
          if (row) {
            if (row.node.kind === "file") {
              onPinFile?.(row.node.path);
            } else {
              onSelect?.(row.node.path, row.node.kind);
              if (row.node.children?.length) {
                toggle(row.node.path);
              }
            }
          }
        }
      }}
    >
      {rows.length > VIRTUALIZE_AFTER ? (
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {rendered}
        </div>
      ) : (
        rendered
      )}
    </div>
  );
}
