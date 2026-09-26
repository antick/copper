import { FolderOpen, NotebookPen, Settings, SquareKanban } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";

export function ActivityRail({
  platform,
  notesActive = true,
  tasksActive = false,
  settingsActive = false,
  onOpenNotes,
  onOpenTasks,
  onOpenVault,
  onOpenSettings,
}: {
  platform?: string;
  notesActive?: boolean;
  tasksActive?: boolean;
  settingsActive?: boolean;
  onOpenNotes?: () => void;
  onOpenTasks?: () => void;
  onOpenVault: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <aside className="copper-activity-rail" aria-label="Workspace">
      <div
        className="copper-activity-rail-header"
        data-platform={platform}
        data-copper-drag-region
      />
      <div className="copper-activity-rail-modes">
        <Tooltip content="Notes" side="right">
          <IconButton
            label="Notes"
            aria-pressed={notesActive}
            onClick={onOpenNotes}
          >
            <NotebookPen size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Tasks" side="right">
          <IconButton
            label="Tasks"
            aria-pressed={tasksActive}
            onClick={onOpenTasks}
          >
            <SquareKanban size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      </div>
      <span className="copper-header-spacer" data-copper-drag-region />
      <Tooltip content="Open another Vault" side="right">
        <IconButton label="Open another Vault" onClick={onOpenVault}>
          <FolderOpen size={16} strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
      <Tooltip content="Settings" side="right">
        <IconButton
          label="Open settings"
          aria-pressed={settingsActive}
          onClick={onOpenSettings}
        >
          <Settings size={16} strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
    </aside>
  );
}
