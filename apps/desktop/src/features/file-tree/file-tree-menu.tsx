import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ReactNode } from "react";
import type { SupportedFileKind } from "@/features/file-tree/types";

export function FileTreeContextMenu({
  children,
  isFolder,
  isRoot = false,
  fileKind,
  archived = false,
  onNewNote,
  onNewFolder,
  onRename,
  onArchive,
  onRestore,
  onTrash,
}: {
  children: ReactNode;
  isFolder: boolean;
  isRoot?: boolean;
  fileKind?: SupportedFileKind;
  archived?: boolean;
  onNewNote: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onTrash: () => void;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="copper-menu">
          {isFolder ? (
            <>
              <ContextMenu.Item
                className="copper-menu-item"
                onSelect={onNewNote}
              >
                New note
              </ContextMenu.Item>
              <ContextMenu.Item
                className="copper-menu-item"
                onSelect={onNewFolder}
              >
                New folder
              </ContextMenu.Item>
            </>
          ) : null}
          {!isRoot ? (
            <>
              <ContextMenu.Item
                className="copper-menu-item"
                onSelect={onRename}
              >
                Rename
              </ContextMenu.Item>
              {!isFolder && fileKind === "markdown" ? (
                <ContextMenu.Item
                  className="copper-menu-item"
                  onSelect={archived ? onRestore : onArchive}
                >
                  {archived ? "Restore from Archive" : "Archive"}
                </ContextMenu.Item>
              ) : null}
              <ContextMenu.Item
                className="copper-menu-item copper-menu-item-danger"
                onSelect={onTrash}
              >
                Move to Trash…
              </ContextMenu.Item>
            </>
          ) : null}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
