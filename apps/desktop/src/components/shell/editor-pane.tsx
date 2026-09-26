import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Archive,
  ArchiveRestore,
  Circle,
  Code2,
  LoaderCircle,
  MoreHorizontal,
  PanelRight,
  Pencil,
  SquareKanban,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { WorkspaceTopBar } from "@/components/shell/workspace-top-bar";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import type { SupportedFileKind } from "@/features/file-tree/types";
import type { EditorTab } from "@/features/tabs/types";
import { fileStem } from "@/lib/paths";

const SAVE_CHROME = {
  dirty: { label: "Unsaved changes", icon: Circle, className: "is-dirty" },
  saving: { label: "Saving…", icon: LoaderCircle, className: "is-saving" },
  error: { label: "Save failed", icon: TriangleAlert, className: "is-error" },
} as const;

export function EditorPane({
  children,
  path,
  fileKind,
  archived = false,
  favorited,
  livePreviewEnabled,
  onToggleFavorite,
  onToggleSource,
  onRename,
  onArchive,
  onRestore,
  onTrash,
  saveStatus = "saved",
  tabs = [],
  onActivateTab,
  onPinTab,
  onCloseTab,
  onReorderTab,
  onDocumentInteraction,
  leftRestoreControl = false,
  onToggleLeft,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onSearch,
  noteListVisible = true,
  onToggleNoteList,
  rightCollapsed,
  onToggleRight,
  onOpenInTasks,
}: {
  children?: ReactNode;
  path?: string;
  fileKind?: SupportedFileKind;
  archived?: boolean;
  tabs?: EditorTab[];
  favorited?: boolean;
  livePreviewEnabled?: boolean;
  saveStatus?: "saved" | "dirty" | "saving" | "error";
  onActivateTab?: (path: string) => void;
  onPinTab?: (path: string) => void;
  onCloseTab?: (path: string) => void;
  onReorderTab?: (from: number, to: number) => void;
  onDocumentInteraction?: () => void;
  onToggleFavorite?: () => void;
  onToggleSource?: () => void;
  onRename?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onTrash?: () => void;
  leftRestoreControl?: boolean;
  onToggleLeft?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onSearch?: () => void;
  noteListVisible?: boolean;
  onToggleNoteList?: () => void;
  rightCollapsed?: boolean;
  onToggleRight?: () => void;
  onOpenInTasks?: () => void;
}) {
  const markdown = fileKind === "markdown";
  const editable = Boolean(fileKind && fileKind !== "image");
  const showProperties = Boolean(rightCollapsed && markdown);

  return (
    <section className="copper-pane copper-pane-editor" aria-label="Editor">
      <WorkspaceTopBar
        tabs={tabs.map((tab) => ({
          id: tab.path,
          label: tab.path.split("/").at(-1) ?? tab.path,
          preview: tab.preview,
        }))}
        activeId={path}
        tabListLabel="Open notes"
        onActivateTab={onActivateTab ?? (() => undefined)}
        onPinTab={onPinTab ?? (() => undefined)}
        onCloseTab={onCloseTab ?? (() => undefined)}
        onReorderTab={onReorderTab}
        firstVisible={leftRestoreControl}
        onRestoreSidebar={leftRestoreControl ? onToggleLeft : undefined}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
        onSearch={onSearch}
        navigationVisible={noteListVisible}
        onToggleNavigation={onToggleNoteList}
        actions={
          <>
            {editable && saveStatus !== "saved" ? (
              <SaveIndicator status={saveStatus} />
            ) : null}
            {onOpenInTasks ? (
              <Tooltip content="Open in Tasks">
                <IconButton label="Open in Tasks" onClick={onOpenInTasks}>
                  <SquareKanban size={16} strokeWidth={1.75} />
                </IconButton>
              </Tooltip>
            ) : null}
            {markdown ? (
              <Tooltip content={favorited ? "Unfavorite" : "Favorite"}>
                <IconButton
                  label="Favorite note"
                  onClick={() => {
                    onDocumentInteraction?.();
                    onToggleFavorite?.();
                  }}
                  disabled={!path}
                >
                  <Star
                    size={16}
                    strokeWidth={1.75}
                    fill={favorited ? "currentColor" : "none"}
                  />
                </IconButton>
              </Tooltip>
            ) : null}
            <DropdownMenu.Root>
              <Tooltip content="More file actions">
                <DropdownMenu.Trigger asChild>
                  <IconButton label="More file actions" disabled={!path}>
                    <MoreHorizontal size={16} strokeWidth={1.75} />
                  </IconButton>
                </DropdownMenu.Trigger>
              </Tooltip>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="copper-menu" align="end">
                  <DropdownMenu.Item
                    className="copper-menu-item copper-menu-item-with-icon"
                    onSelect={() => {
                      onDocumentInteraction?.();
                      onRename?.();
                    }}
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                    Rename file
                  </DropdownMenu.Item>
                  {onOpenInTasks ? (
                    <DropdownMenu.Item
                      className="copper-menu-item copper-menu-item-with-icon"
                      onSelect={onOpenInTasks}
                    >
                      <SquareKanban size={14} strokeWidth={1.75} />
                      Open in Tasks
                    </DropdownMenu.Item>
                  ) : null}
                  {markdown ? (
                    <>
                      <DropdownMenu.Item
                        className="copper-menu-item copper-menu-item-with-icon"
                        onSelect={() => {
                          onDocumentInteraction?.();
                          onToggleSource?.();
                        }}
                      >
                        <Code2 size={14} strokeWidth={1.75} />
                        {livePreviewEnabled ? "Show source" : "Live preview"}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="copper-menu-item copper-menu-item-with-icon"
                        onSelect={() => {
                          onDocumentInteraction?.();
                          if (archived) onRestore?.();
                          else onArchive?.();
                        }}
                      >
                        {archived ? (
                          <ArchiveRestore size={14} strokeWidth={1.75} />
                        ) : (
                          <Archive size={14} strokeWidth={1.75} />
                        )}
                        {archived ? "Restore from Archive" : "Archive"}
                      </DropdownMenu.Item>
                    </>
                  ) : null}
                  <DropdownMenu.Separator className="copper-menu-separator" />
                  <DropdownMenu.Item
                    className="copper-menu-item copper-menu-item-with-icon copper-menu-item-danger"
                    onSelect={() => {
                      onDocumentInteraction?.();
                      onTrash?.();
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                    Move to Trash…
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {showProperties ? (
              <>
                <span className="copper-header-divider" aria-hidden="true" />
                <Tooltip content="Show properties">
                  <IconButton label="Show properties" onClick={onToggleRight}>
                    <PanelRight size={16} strokeWidth={1.75} />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
          </>
        }
      />
      <div
        className="copper-scroll"
        onPointerDownCapture={onDocumentInteraction}
        onFocusCapture={onDocumentInteraction}
      >
        {path ? (
          <h1 className="copper-document-title">{fileStem(path)}</h1>
        ) : null}
        {children ?? (
          <div className="copper-empty">Select a file to start working.</div>
        )}
      </div>
    </section>
  );
}

function SaveIndicator({ status }: { status: keyof typeof SAVE_CHROME }) {
  const details = SAVE_CHROME[status];
  const Icon = details.icon;
  return (
    <span
      className={`copper-save-indicator ${details.className}`}
      aria-live="polite"
      title={details.label}
    >
      <Icon size={15} strokeWidth={1.75} />
      <span className="sr-only">{details.label}</span>
    </span>
  );
}
