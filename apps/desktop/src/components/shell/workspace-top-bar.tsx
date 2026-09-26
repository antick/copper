import { PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { WindowNavControls } from "@/components/shell/window-nav-controls";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { TabStrip, type WorkspaceTab } from "@/features/tabs/tab-strip";

export function WorkspaceTopBar({
  tabs,
  activeId,
  tabListLabel,
  onActivateTab,
  onPinTab,
  onCloseTab,
  onReorderTab,
  firstVisible = false,
  onRestoreSidebar,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onSearch,
  searchLabel,
  navigationVisible,
  navigationName,
  onToggleNavigation,
  actions,
}: {
  tabs: WorkspaceTab[];
  activeId?: string;
  tabListLabel: string;
  onActivateTab: (id: string) => void;
  onPinTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onReorderTab?: (from: number, to: number) => void;
  firstVisible?: boolean;
  onRestoreSidebar?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onSearch?: () => void;
  searchLabel?: string;
  navigationVisible?: boolean;
  navigationName?: string;
  onToggleNavigation?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div
      className="copper-header-row copper-workspace-top-bar"
      data-copper-drag-region
      data-first-visible-pane={firstVisible || undefined}
    >
      {onRestoreSidebar ? (
        <Tooltip content="Show left sidebar">
          <IconButton label="Show left sidebar" onClick={onRestoreSidebar}>
            <PanelLeft size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      ) : null}
      <WindowNavControls
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
        onSearch={onSearch}
        searchLabel={searchLabel}
        navigationVisible={navigationVisible}
        navigationName={navigationName}
        onToggleNavigation={onToggleNavigation}
      />
      <TabStrip
        tabs={tabs}
        activeId={activeId}
        ariaLabel={tabListLabel}
        onActivate={onActivateTab}
        onPin={onPinTab}
        onClose={onCloseTab}
        onReorder={onReorderTab}
      />
      {actions ? <div className="copper-header-actions">{actions}</div> : null}
    </div>
  );
}
