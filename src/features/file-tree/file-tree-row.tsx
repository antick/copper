import {
  AlignLeft,
  Braces,
  Code2,
  FileText,
  Folder,
  FolderOpen,
  Image,
} from "lucide-react";
import { forwardRef, type HTMLAttributes } from "react";
import { treeVisibleName } from "@/features/file-tree/tree-visible-name";
import type { VisibleTreeRow } from "@/features/file-tree/types";
import { LEFT_ROW_INSET } from "@/lib/left-pane-layout";

export const TREE_ROW_BASE_INSET = LEFT_ROW_INSET;
export const TREE_DEPTH_STEP = 12;
export const TREE_ROW_ICON_SIZE = 14;

const ROW_ICON_STYLE = {
  width: TREE_ROW_ICON_SIZE,
  height: TREE_ROW_ICON_SIZE,
  minWidth: TREE_ROW_ICON_SIZE,
  flexShrink: 0,
} as const;

export function treeRowPadding(depth: number) {
  return TREE_ROW_BASE_INSET + depth * TREE_DEPTH_STEP;
}

export const FileTreeRow = forwardRef<
  HTMLDivElement,
  {
    row: VisibleTreeRow;
    selected: boolean;
    focused: boolean;
    onSelect: () => void;
    onToggle: () => void;
    onPinFile?: () => void;
  } & HTMLAttributes<HTMLDivElement>
>(function FileTreeRow(
  { row, selected, focused, onSelect, onToggle, onPinFile, ...props },
  ref,
) {
  const isFolder = row.node.kind === "directory";
  const hasChildren = isFolder && Boolean(row.node.children?.length);
  const visibleName = treeVisibleName(
    row.node.name,
    row.node.kind,
    row.node.typeLabel,
  );
  const Icon = isFolder
    ? hasChildren && row.expanded
      ? FolderOpen
      : Folder
    : row.node.fileKind === "code"
      ? Code2
      : row.node.fileKind === "data"
        ? Braces
        : row.node.fileKind === "text"
          ? AlignLeft
          : row.node.fileKind === "image"
            ? Image
            : FileText;

  return (
    <div
      ref={ref}
      {...props}
      role="treeitem"
      aria-selected={selected}
      aria-expanded={hasChildren ? row.expanded : undefined}
      aria-label={row.node.name}
      aria-level={row.depth + 1}
      tabIndex={focused ? 0 : -1}
      className="copper-tree-row"
      data-selected={selected}
      data-focused={focused}
      style={{ paddingLeft: treeRowPadding(row.depth) }}
      onClick={(event) => {
        if (isFolder && event.detail > 1) {
          return;
        }
        onSelect();
        if (hasChildren) {
          onToggle();
        }
      }}
      onDoubleClick={() => {
        if (!isFolder) {
          onPinFile?.();
        }
      }}
    >
      <Icon
        className="copper-tree-icon"
        size={TREE_ROW_ICON_SIZE}
        strokeWidth={1.75}
        aria-hidden="true"
        style={ROW_ICON_STYLE}
      />
      <span className="copper-tree-name">{visibleName}</span>
      {!isFolder && row.node.typeLabel ? (
        <span className="copper-tree-type" aria-hidden="true">
          {row.node.typeLabel}
        </span>
      ) : null}
    </div>
  );
});
