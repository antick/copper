import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { BacklinksSection } from "@/features/backlinks/backlinks-section";
import { PropertiesPanel } from "@/features/properties/properties-panel";

export function PropertiesPane({
  onClose,
  vaultId,
  path,
  onOpen,
  onDocumentInteraction,
}: {
  onClose: () => void;
  vaultId?: string;
  path?: string;
  onOpen?: (path: string) => void;
  onDocumentInteraction?: () => void;
}) {
  return (
    <aside
      className="copper-pane copper-pane-properties"
      aria-label="Properties"
    >
      <div
        className="copper-header-row copper-sidebar-header"
        data-copper-drag-region
      >
        <span className="copper-pane-title">Properties</span>
        <Tooltip content="Hide properties">
          <IconButton label="Close properties" onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      </div>
      <div className="copper-scroll">
        <PropertiesPanel
          vaultId={vaultId}
          path={path}
          onInteraction={onDocumentInteraction}
        />
        <BacklinksSection vaultId={vaultId} path={path} onOpen={onOpen} />
      </div>
    </aside>
  );
}
