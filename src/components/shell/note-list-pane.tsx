import { PanelLeft, Plus, Search, X } from "lucide-react";
import { type RefObject, useMemo, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useNoteList } from "@/features/search/queries";
import { SearchResults } from "@/features/search/search-results";
import type { SearchHit } from "@/lib/copper/search";

export function NoteListPane({
  title = "All Notes",
  vaultId,
  scope = "all",
  searchInput,
  onSearchInput,
  searchOpen,
  onSearchOpen,
  searchQuery,
  selectedPath,
  onOpen,
  onPin,
  onNewNote,
  searchRef,
  indexing = false,
  indexError = false,
  leftRestoreControl = false,
  onToggleLeft,
  notesOverride,
}: {
  title?: string;
  vaultId?: string;
  scope?: string;
  searchInput?: string;
  onSearchInput?: (value: string) => void;
  searchOpen?: boolean;
  onSearchOpen?: (open: boolean) => void;
  searchQuery?: string;
  selectedPath?: string;
  onOpen?: (path: string) => void;
  onPin?: (path: string) => void;
  onNewNote?: () => void;
  searchRef?: RefObject<HTMLInputElement | null>;
  indexing?: boolean;
  indexError?: boolean;
  leftRestoreControl?: boolean;
  onToggleLeft?: () => void;
  notesOverride?: SearchHit[];
}) {
  const notes = useNoteList(vaultId, scope, searchQuery ?? "");
  const [sort, setSort] = useState<"modified" | "title">("modified");
  const [localSearchOpen, setLocalSearchOpen] = useState(Boolean(searchInput));
  const searchFieldOpen = searchOpen ?? localSearchOpen;
  function setSearchFieldOpen(open: boolean) {
    setLocalSearchOpen(open);
    onSearchOpen?.(open);
  }
  const sorted = useMemo(() => {
    const source = notesOverride ?? notes.data ?? [];
    const query = (searchQuery ?? "").trim().toLowerCase();
    const rows = query
      ? source.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.path.toLowerCase().includes(query),
        )
      : [...source];
    if (sort === "title") {
      rows.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      rows.sort((a, b) => b.mtimeNs - a.mtimeNs);
    }
    return rows;
  }, [notes.data, notesOverride, searchQuery, sort]);

  return (
    <section className="copper-pane copper-pane-list" aria-label="Note list">
      <div
        className="copper-header-row"
        data-copper-drag-region
        data-first-visible-pane={leftRestoreControl || undefined}
      >
        {leftRestoreControl ? (
          <Tooltip content="Show left sidebar">
            <IconButton label="Show left sidebar" onClick={onToggleLeft}>
              <PanelLeft size={16} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
        ) : null}
        {searchFieldOpen ? (
          <div className="copper-search-field">
            <Search size={14} strokeWidth={1.75} />
            <input
              ref={searchRef}
              value={searchInput ?? ""}
              aria-label="Filter notes in this view"
              placeholder="Filter this view"
              onChange={(event) => onSearchInput?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onSearchInput?.("");
                  setSearchFieldOpen(false);
                }
              }}
            />
            <Tooltip content="Close search">
              <IconButton
                label="Close search"
                onClick={() => {
                  onSearchInput?.("");
                  setSearchFieldOpen(false);
                }}
              >
                <X size={13} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          </div>
        ) : (
          <>
            <span className="copper-pane-title">{title}</span>
            <select
              className="copper-sort"
              aria-label="Sort notes"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "modified" | "title")
              }
            >
              <option value="modified">Modified</option>
              <option value="title">Title</option>
            </select>
            <span className="copper-header-spacer" data-copper-drag-region />
            <Tooltip content="Filter this view">
              <IconButton
                label="Filter this view"
                onClick={() => {
                  setSearchFieldOpen(true);
                  queueMicrotask(() => searchRef?.current?.focus());
                }}
              >
                <Search size={16} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip content="New note">
          <IconButton label="New note" onClick={onNewNote}>
            <Plus size={16} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      </div>
      {notes.isPending ? (
        <p
          className="copper-empty"
          data-testid="note-list-loading"
          role="status"
        >
          Loading notes…
        </p>
      ) : (
        <SearchResults
          notes={sorted}
          selectedPath={selectedPath}
          onOpen={onOpen ?? (() => undefined)}
          onPin={onPin}
          emptyLabel={
            indexError
              ? "The note index could not be updated."
              : indexing
                ? "Indexing notes…"
                : "No notes in this view."
          }
        />
      )}
    </section>
  );
}
