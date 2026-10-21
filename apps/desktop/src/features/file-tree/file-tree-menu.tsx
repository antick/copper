import * as ContextMenu from "@radix-ui/react-context-menu";
import { type ReactNode, useRef } from "react";
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
  onOpen,
}: {
  children: ReactNode;
  isFolder: boolean;
  isRoot?: boolean;
  fileKind?: SupportedFileKind;
  archived?: boolean;
  onNewNote: (returnFocus?: () => void) => void;
  onNewFolder: (returnFocus?: () => void) => void;
  onRename: (returnFocus?: () => void) => void;
  onArchive: () => void;
  onRestore: () => void;
  onTrash: () => void;
  onOpen?: () => void;
}) {
  const trigger = useRef<HTMLSpanElement>(null);
  const returnFocus = () => trigger.current?.focus();
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger ref={trigger} asChild>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="copper-menu">
          {onOpen ? (
            <ContextMenu.Item className="copper-menu-item" onSelect={onOpen}>
              Open in new tab
            </ContextMenu.Item>
          ) : null}
          {isFolder ? (
            <>
              <ContextMenu.Item
                className="copper-menu-item"
                onSelect={() => onNewNote(returnFocus)}
              >
                New note
              </ContextMenu.Item>
              <ContextMenu.Item
                className="copper-menu-item"
                onSelect={() => onNewFolder(returnFocus)}
              >
                New folder
              </ContextMenu.Item>
            </>
          ) : null}
          {!isRoot ? (
            <>
              <ContextMenu.Item
                className="copper-menu-item"
                onSelect={() => onRename(returnFocus)}
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
