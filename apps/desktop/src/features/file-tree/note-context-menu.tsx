import type { ReactNode } from "react";
import { FileTreeContextMenu } from "@/features/file-tree/file-tree-menu";

export interface NoteFileActions {
  onRename: (path: string, returnFocus?: () => void) => void;
  onArchive: (path: string) => void;
  onRestore: (path: string) => void;
  onTrash: (path: string) => void;
}

export function NoteContextMenu({
  children,
  path,
  actions,
  onPin,
}: {
  children: ReactNode;
  path: string;
  actions?: NoteFileActions;
  onPin?: (path: string) => void;
}) {
  if (!actions) return children;
  return (
    <FileTreeContextMenu
      isFolder={false}
      fileKind="markdown"
      archived={path.startsWith("Archive/")}
      onOpen={onPin ? () => onPin(path) : undefined}
      onNewNote={() => undefined}
      onNewFolder={() => undefined}
      onRename={(returnFocus) => actions.onRename(path, returnFocus)}
      onArchive={() => actions.onArchive(path)}
      onRestore={() => actions.onRestore(path)}
      onTrash={() => actions.onTrash(path)}
    >
      {children}
    </FileTreeContextMenu>
  );
}
