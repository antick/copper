import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { isBaseBoardStatus } from "@/features/tasks/workflow";
import type { TaskWorkflowColumn } from "@/lib/copper/tasks";

export function WorkflowColumnMenu({
  column,
  onRename,
  onMove,
  onHide,
  onArchive,
}: {
  column: TaskWorkflowColumn;
  onRename?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onHide?: () => void;
  onArchive?: () => void;
}) {
  const custom = !isBaseBoardStatus(column.id);
  if (!onRename && !onMove && !onHide && !onArchive) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="copper-task-column-action"
          aria-label={`Manage ${column.label} column`}
        >
          <MoreHorizontal size={14} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="copper-menu" align="end">
          {custom && onRename ? (
            <DropdownMenu.Item className="copper-menu-item" onSelect={onRename}>
              <Pencil size={14} aria-hidden /> Rename
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            className="copper-menu-item"
            onSelect={() => onMove?.(-1)}
          >
            <ArrowLeft size={14} aria-hidden /> Move left
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="copper-menu-item"
            onSelect={() => onMove?.(1)}
          >
            <ArrowRight size={14} aria-hidden /> Move right
          </DropdownMenu.Item>
          {onHide ? (
            <DropdownMenu.Item className="copper-menu-item" onSelect={onHide}>
              <EyeOff size={14} aria-hidden /> Hide column
            </DropdownMenu.Item>
          ) : null}
          {custom && onArchive ? (
            <>
              <DropdownMenu.Separator className="copper-menu-separator" />
              <DropdownMenu.Item
                className="copper-menu-item copper-menu-item-danger"
                onSelect={onArchive}
              >
                <Archive size={14} aria-hidden /> Archive column
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function WorkflowVisibilityMenu({
  columns,
  onShow,
}: {
  columns: TaskWorkflowColumn[];
  onShow: (column: TaskWorkflowColumn) => void;
}) {
  if (!columns.length) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="copper-task-board-action">
          <Eye size={14} aria-hidden /> Show columns
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="copper-menu" align="end">
          {columns.map((column) => (
            <DropdownMenu.Item
              key={column.id}
              className="copper-menu-item"
              onSelect={() => onShow(column)}
            >
              <Eye size={14} aria-hidden /> {column.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
