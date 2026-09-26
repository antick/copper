import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FilePlus2, FolderPlus, Plus, Star, StickyNote } from "lucide-react";
import { TitleRegion } from "@/components/shell/title-region";
import { FileTree } from "@/features/file-tree/file-tree";
import { useFileMutations } from "@/features/file-tree/mutations";
import { useVaultTree } from "@/features/file-tree/queries";
import type { FileTreeNode } from "@/features/file-tree/types";
import { useNoteList } from "@/features/search/queries";
import type { SearchHit } from "@/lib/copper/search";
import { fileName } from "@/lib/paths";

const NAV = [
  { id: "all", label: "All Notes", icon: StickyNote },
  { id: "favorites", label: "Favorites", icon: Star },
] as const;

export function LeftSidebar({
  selectedNav = "all",
  onSelectNav,
  vaultId,
  selectedPath,
  onSelectPath,
  platform,
  leftCollapsed,
  onToggleLeft,
  favorites,
  treeMode = "tree",
  onNewNote,
  onPinFile,
  onFileCreated,
  onPathRenamed,
  onPathRemoved,
  onBeforeFileOperation,
}: {
  selectedNav?: string;
  onSelectNav?: (id: string) => void;
  vaultId?: string;
  vaultName?: string;
  selectedPath?: string;
  onSelectPath?: (path: string, kind: string) => void;
  platform?: string;
  leftCollapsed: boolean;
  onToggleLeft: () => void;
  favorites?: SearchHit[];
  treeMode?: "folders" | "tree";
  onNewNote?: () => void;
  onPinFile?: (path: string) => void;
  onFileCreated?: (path: string) => void;
  onPathRenamed?: (from: string, to: string) => void;
  onPathRemoved?: (path: string) => void;
  onBeforeFileOperation?: () => Promise<void>;
}) {
  const tree = useVaultTree(vaultId);
  const mutations = useFileMutations(vaultId);
  const all = useNoteList(vaultId, "all", "");
  const counts = {
    all: all.data?.length ?? 0,
    favorites: favorites?.length ?? 0,
  };

  return (
    <aside
      className="copper-pane copper-pane-left"
      aria-label="Vault navigation"
    >
      <TitleRegion
        platform={platform}
        label="Notes"
        leftCollapsed={leftCollapsed}
        onToggleLeft={onToggleLeft}
      />
      <div className="copper-scroll copper-left-extras">
        <ul className="copper-nav-list">
          {NAV.map((item) => {
            const Icon = item.icon;
            const count = counts[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="copper-nav-item"
                  data-selected={selectedNav === item.id}
                  onClick={() => onSelectNav?.(item.id)}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {item.label}
                  <span className="copper-nav-count">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="copper-section-label">Pinned</div>
        <ul className="copper-nav-list">
          {(favorites ?? []).length === 0 ? (
            <li>
              <p className="copper-empty">Star a note to pin it here.</p>
            </li>
          ) : (
            (favorites ?? []).map((note) => (
              <li key={note.path}>
                <button
                  type="button"
                  className="copper-nav-item"
                  data-selected={selectedPath === note.path}
                  onClick={() => onSelectPath?.(note.path, "file")}
                  onDoubleClick={() => onPinFile?.(note.path)}
                >
                  <Star size={14} strokeWidth={1.75} />
                  <span className="copper-nav-item-label">
                    {fileName(note.path)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="copper-section-heading">
          <div className="copper-section-label">Folders</div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="copper-section-add"
                aria-label="Add to Vault"
              >
                <Plus size={14} strokeWidth={1.75} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="copper-menu" align="end">
                <DropdownMenu.Item
                  className="copper-menu-item copper-menu-item-with-icon"
                  onSelect={onNewNote}
                >
                  <FilePlus2 size={14} strokeWidth={1.75} />
                  New note
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="copper-menu-item copper-menu-item-with-icon"
                  onSelect={() => {
                    const path = window
                      .prompt("New folder name", "folder")
                      ?.trim();
                    if (path) {
                      mutations.createFolder.mutate(path, {
                        onError: showMutationError,
                      });
                    }
                  }}
                >
                  <FolderPlus size={14} strokeWidth={1.75} />
                  New folder
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        <FolderSection
          tree={tree.data}
          pending={tree.isPending && !tree.data}
          error={tree.isError}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onPinFile={onPinFile}
          treeMode={treeMode}
          vaultId={vaultId}
          onFileCreated={onFileCreated}
          onPathRenamed={onPathRenamed}
          onPathRemoved={onPathRemoved}
          onBeforeFileOperation={onBeforeFileOperation}
        />
      </div>
    </aside>
  );
}

function showMutationError(error: Error) {
  window.alert(error.message || "The file operation failed.");
}

function FolderSection({
  tree,
  pending,
  error,
  selectedPath,
  onSelectPath,
  onPinFile,
  treeMode,
  vaultId,
  onFileCreated,
  onPathRenamed,
  onPathRemoved,
  onBeforeFileOperation,
}: {
  tree?: FileTreeNode;
  pending?: boolean;
  error?: boolean;
  selectedPath?: string;
  onSelectPath?: (path: string, kind: string) => void;
  onPinFile?: (path: string) => void;
  treeMode: "folders" | "tree";
  vaultId?: string;
  onFileCreated?: (path: string) => void;
  onPathRenamed?: (from: string, to: string) => void;
  onPathRemoved?: (path: string) => void;
  onBeforeFileOperation?: () => Promise<void>;
}) {
  if (pending) {
    return <p className="copper-empty">Loading folders…</p>;
  }
  if (error) {
    return <p className="copper-empty">Couldn’t load folders.</p>;
  }
  if (!tree) {
    return (
      <p className="copper-empty">
        Open a Vault to browse nested folders and files.
      </p>
    );
  }
  if (!tree.children?.length) {
    return <p className="copper-empty">This Vault is empty.</p>;
  }
  return (
    <FileTree
      tree={tree}
      selectedPath={selectedPath}
      onSelect={onSelectPath}
      onPinFile={onPinFile}
      mode={treeMode}
      vaultId={vaultId}
      onFileCreated={onFileCreated}
      onPathRenamed={onPathRenamed}
      onPathRemoved={onPathRemoved}
      onBeforeFileOperation={onBeforeFileOperation}
    />
  );
}
