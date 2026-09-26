import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { EditorPane } from "@/components/shell/editor-pane";
import { LeftSidebar } from "@/components/shell/left-sidebar";
import { NoteListPane } from "@/components/shell/note-list-pane";
import { PropertiesPane } from "@/components/shell/properties-pane";
import type { NoteWorkspaceActions } from "@/components/shell/use-note-workspace-actions";
import { PaneResizer } from "@/components/ui/pane-resizer";
import { CopperEditor } from "@/features/editor/copper-editor";
import { ImageViewer } from "@/features/editor/image-viewer";
import type { SupportedFileKind } from "@/features/file-tree/types";
import type {
  SessionAction,
  SessionState,
} from "@/features/tabs/session-reducer";
import type { SearchHit } from "@/lib/copper/search";
import type { CopperSettings } from "@/lib/copper/settings";
import { isMacPlatform } from "@/lib/platform";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

export function NotesWorkspace({
  children,
  vaultId,
  vaultName,
  platform,
  session,
  settings,
  nav,
  folder,
  selectedPath,
  activeFileKind,
  activeIsArchived,
  activeIsMarkdown,
  favoriteNotes,
  listTitle,
  searchInput,
  searchQuery,
  listSearchOpen,
  searchRef,
  indexState,
  livePreviewEnabled,
  saveStatus,
  actions,
  updateSession,
  setNav,
  setFolder,
  setSearchInput,
  setListSearchOpen,
  setLivePreviewEnabled,
  setSaveStatus,
  onSearch,
  onToggleNoteList,
  onOpenInTasks,
}: {
  children?: ReactNode;
  vaultId?: string;
  vaultName: string;
  platform?: string;
  session: SessionState;
  settings: CopperSettings;
  nav: string;
  folder: string;
  selectedPath?: string;
  activeFileKind?: SupportedFileKind;
  activeIsArchived: boolean;
  activeIsMarkdown: boolean;
  favoriteNotes: SearchHit[];
  listTitle: string;
  searchInput: string;
  searchQuery: string;
  listSearchOpen: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  indexState: "idle" | "indexing" | "error";
  livePreviewEnabled: boolean;
  saveStatus: SaveStatus;
  actions: NoteWorkspaceActions;
  updateSession: Dispatch<SessionAction>;
  setNav: Dispatch<SetStateAction<string>>;
  setFolder: Dispatch<SetStateAction<string>>;
  setSearchInput: Dispatch<SetStateAction<string>>;
  setListSearchOpen: Dispatch<SetStateAction<boolean>>;
  setLivePreviewEnabled: Dispatch<SetStateAction<boolean>>;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  onSearch: () => void;
  onToggleNoteList: () => void;
  onOpenInTasks?: () => void;
}) {
  return (
    <div className="copper-panes">
      {!session.leftCollapsed ? (
        <>
          <LeftSidebar
            selectedNav={nav}
            onSelectNav={(id) => {
              setNav(id);
              setFolder("");
              setSearchInput("");
            }}
            vaultId={vaultId}
            vaultName={vaultName}
            selectedPath={
              settings.navigationLayout === "note-list" && nav === "folder"
                ? folder
                : selectedPath
            }
            treeMode={settings.navigationLayout === "tree" ? "tree" : "folders"}
            onSelectPath={(path, kind) => {
              if (kind === "directory") {
                setNav(path ? "folder" : "all");
                setFolder(path);
                setSearchInput("");
              } else actions.openPreview(path);
            }}
            onPinFile={actions.openPinned}
            onNewNote={() => void actions.createNote("")}
            platform={platform}
            leftCollapsed={false}
            onToggleLeft={() => updateSession({ type: "toggle-left" })}
            favorites={favoriteNotes}
            onFileCreated={actions.openPinned}
            onPathRenamed={actions.renameSessionPaths}
            onPathRemoved={actions.removeSessionPaths}
            onBeforeFileOperation={actions.flushActiveDocument}
          />
          <PaneResizer
            cssVar="--left-sidebar-width"
            min={180}
            max={420}
            lineBelowHeader={isMacPlatform(platform)}
          />
        </>
      ) : null}
      {settings.navigationLayout === "note-list" ? (
        <>
          <NoteListPane
            title={listTitle}
            vaultId={vaultId}
            scope={nav === "folder" ? folder : "all"}
            notesOverride={nav === "favorites" ? favoriteNotes : undefined}
            searchInput={searchInput}
            onSearchInput={setSearchInput}
            searchOpen={listSearchOpen}
            onSearchOpen={setListSearchOpen}
            searchQuery={searchQuery}
            selectedPath={selectedPath}
            onOpen={actions.openPreview}
            onPin={actions.openPinned}
            onNewNote={() => void actions.createNote()}
            searchRef={searchRef}
            indexing={indexState === "indexing"}
            indexError={indexState === "error"}
            leftRestoreControl={session.leftCollapsed}
            onToggleLeft={() => updateSession({ type: "toggle-left" })}
          />
          <PaneResizer cssVar="--note-list-width" min={220} max={480} />
        </>
      ) : null}
      <EditorPane
        path={selectedPath}
        fileKind={activeFileKind}
        archived={activeIsArchived}
        favorited={Boolean(
          activeIsMarkdown &&
            selectedPath &&
            session.favorites.includes(selectedPath),
        )}
        livePreviewEnabled={livePreviewEnabled}
        onToggleFavorite={() =>
          selectedPath &&
          updateSession({ type: "toggle-favorite", path: selectedPath })
        }
        onToggleSource={() => setLivePreviewEnabled((value) => !value)}
        onRename={() => void actions.renameActiveFile()}
        onArchive={() => void actions.moveActiveArchive(false)}
        onRestore={() => void actions.moveActiveArchive(true)}
        onTrash={() => void actions.trashActiveFile()}
        saveStatus={saveStatus}
        tabs={session.tabs}
        onActivateTab={(path) => updateSession({ type: "activate", path })}
        onPinTab={(path) => updateSession({ type: "pin", path })}
        onCloseTab={(path) => updateSession({ type: "close", path })}
        onReorderTab={(from, to) =>
          updateSession({ type: "reorder", from, to })
        }
        onDocumentInteraction={actions.pinActive}
        leftRestoreControl={
          session.leftCollapsed && settings.navigationLayout === "tree"
        }
        onToggleLeft={() => updateSession({ type: "toggle-left" })}
        canGoBack={actions.historyIndex > 0}
        canGoForward={
          actions.historyIndex >= 0 &&
          actions.historyIndex < actions.historyLength - 1
        }
        onBack={() => actions.goHistory(-1)}
        onForward={() => actions.goHistory(1)}
        onSearch={onSearch}
        noteListVisible={settings.navigationLayout === "note-list"}
        onToggleNoteList={onToggleNoteList}
        rightCollapsed={activeIsMarkdown && session.rightCollapsed}
        onToggleRight={() => updateSession({ type: "toggle-right" })}
        onOpenInTasks={onOpenInTasks}
      >
        {children ??
          (vaultId && selectedPath && activeFileKind ? (
            activeFileKind === "image" ? (
              <ImageViewer
                key={selectedPath}
                vaultId={vaultId}
                path={selectedPath}
              />
            ) : (
              <CopperEditor
                key={`${selectedPath}:${activeFileKind}:${livePreviewEnabled}`}
                vaultId={vaultId}
                path={selectedPath}
                fileKind={activeFileKind}
                livePreviewEnabled={livePreviewEnabled}
                onSaveStatus={setSaveStatus}
                onInteraction={actions.pinActive}
              />
            )
          ) : null)}
      </EditorPane>
      {activeIsMarkdown && !session.rightCollapsed ? (
        <>
          <PaneResizer cssVar="--properties-width" min={220} max={420} invert />
          <PropertiesPane
            onClose={() => updateSession({ type: "set-right", value: true })}
            vaultId={vaultId}
            path={selectedPath}
            onOpen={actions.openPinned}
            onDocumentInteraction={actions.pinActive}
          />
        </>
      ) : null}
    </div>
  );
}
