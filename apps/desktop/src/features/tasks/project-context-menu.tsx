import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  Archive,
  ExternalLink,
  Palette,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import type { ReactElement } from "react";
import type { TaskProject } from "@/lib/copper/tasks";

export type ProjectAction = "rename" | "icon" | "archive" | "delete";

export function ProjectContextMenu({
  project,
  children,
  onOpen,
  onOpenInNewTab,
  onAction,
  pinned,
  onPinnedChange,
}: {
  project: TaskProject;
  children: ReactElement;
  onOpen: () => void;
  onOpenInNewTab: () => void;
  onAction: (action: ProjectAction, project: TaskProject) => void;
  pinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="copper-menu copper-project-context-menu"
          aria-label={`Project actions for ${project.title}`}
        >
          <ContextMenu.Label className="copper-menu-label">
            {project.title}
          </ContextMenu.Label>
          <ContextMenu.Item
            className="copper-menu-item copper-menu-item-with-icon"
            onSelect={onOpen}
          >
            <ExternalLink size={14} aria-hidden /> Open
          </ContextMenu.Item>
          <ContextMenu.Item
            className="copper-menu-item copper-menu-item-with-icon"
            onSelect={onOpenInNewTab}
          >
            <ExternalLink size={14} aria-hidden /> Open in new tab
          </ContextMenu.Item>
          <ContextMenu.Separator className="copper-menu-separator" />
          {onPinnedChange ? (
            <ContextMenu.Item
              className="copper-menu-item copper-menu-item-with-icon"
              onSelect={() => onPinnedChange(!pinned)}
            >
              {pinned ? (
                <PinOff size={14} aria-hidden />
              ) : (
                <Pin size={14} aria-hidden />
              )}
              {pinned ? "Unpin" : "Pin"}
            </ContextMenu.Item>
          ) : null}
          <ContextMenu.Item
            className="copper-menu-item copper-menu-item-with-icon"
            onSelect={() => onAction("rename", project)}
          >
            <Pencil size={14} aria-hidden /> Rename
          </ContextMenu.Item>
          <ContextMenu.Item
            className="copper-menu-item copper-menu-item-with-icon"
            onSelect={() => onAction("icon", project)}
          >
            <Palette size={14} aria-hidden /> Change icon
          </ContextMenu.Item>
          <ContextMenu.Separator className="copper-menu-separator" />
          <ContextMenu.Item
            className="copper-menu-item copper-menu-item-with-icon"
            onSelect={() => onAction("archive", project)}
          >
            <Archive size={14} aria-hidden /> Archive
          </ContextMenu.Item>
          <ContextMenu.Item
            className="copper-menu-item copper-menu-item-with-icon copper-menu-item-danger"
            onSelect={() => onAction("delete", project)}
          >
            <Trash2 size={14} aria-hidden /> Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
