import { ChevronLeft, ChevronRight, List, Search } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";

export function WindowNavControls({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onSearch,
  navigationVisible = true,
  onToggleNavigation,
  noteListVisible,
  onToggleNoteList,
  navigationName = "note list",
  searchLabel = "Search Vault",
}: {
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onSearch?: () => void;
  navigationVisible?: boolean;
  onToggleNavigation?: () => void;
  noteListVisible?: boolean;
  onToggleNoteList?: () => void;
  navigationName?: string;
  searchLabel?: string;
}) {
  const visible = noteListVisible ?? navigationVisible;
  const toggleNavigation = onToggleNoteList ?? onToggleNavigation;
  const navigationLabel = `${visible ? "Hide" : "Show"} ${navigationName}`;
  return (
    <div className="copper-header-actions">
      {toggleNavigation ? (
        <Tooltip content={navigationLabel}>
          <IconButton
            label={navigationLabel}
            onClick={toggleNavigation}
            aria-pressed={visible}
          >
            <List size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip content="Back">
        <IconButton label="Back" disabled={!canGoBack} onClick={onBack}>
          <ChevronLeft size={16} strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
      <Tooltip content="Forward">
        <IconButton
          label="Forward"
          disabled={!canGoForward}
          onClick={onForward}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
      {onSearch ? (
        <Tooltip content={searchLabel}>
          <IconButton label={searchLabel} onClick={onSearch}>
            <Search size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      ) : null}
    </div>
  );
}
