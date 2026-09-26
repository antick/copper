import { PanelLeft } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";

export function TitleRegion({
  vaultName,
  label,
  leftCollapsed,
  onToggleLeft,
}: {
  platform?: string;
  vaultName?: string;
  label?: string;
  leftCollapsed: boolean;
  onToggleLeft: () => void;
}) {
  const title = label ?? vaultName;
  return (
    <header
      className="copper-header-row copper-title-region"
      data-copper-drag-region
    >
      {title ? <span className="copper-vault-name">{title}</span> : null}
      <span className="copper-header-spacer" data-copper-drag-region />
      <Tooltip
        content={leftCollapsed ? "Show left sidebar" : "Hide left sidebar"}
      >
        <IconButton
          label={leftCollapsed ? "Show left sidebar" : "Hide left sidebar"}
          onClick={onToggleLeft}
          aria-pressed={!leftCollapsed}
        >
          <PanelLeft size={16} strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
    </header>
  );
}
