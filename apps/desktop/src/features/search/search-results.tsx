import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import {
  NoteContextMenu,
  type NoteFileActions,
} from "@/features/file-tree/note-context-menu";
import type { SearchHit } from "@/lib/copper/search";
import { formatRelativeTime } from "@/lib/format-time";
import { pillTone } from "@/lib/pills";

const VIRTUALIZE_AFTER = 80;

export function SearchResults({
  notes,
  selectedPath,
  onOpen,
  onPin,
  emptyLabel = "No notes in this view.",
  fileActions,
}: {
  notes: SearchHit[];
  selectedPath?: string;
  onOpen: (path: string) => void;
  onPin?: (path: string) => void;
  emptyLabel?: string;
  fileActions?: NoteFileActions;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    enabled: notes.length > VIRTUALIZE_AFTER,
  });

  if (notes.length === 0) {
    return <p className="copper-empty">{emptyLabel}</p>;
  }

  if (notes.length <= VIRTUALIZE_AFTER) {
    return (
      <div className="copper-scroll" data-testid="note-results">
        <div className="copper-note-list">
          {notes.map((note) => (
            <NoteRow
              key={note.path}
              note={note}
              selected={note.path === selectedPath}
              onOpen={onOpen}
              onPin={onPin}
              fileActions={fileActions}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="copper-scroll" data-testid="note-results">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const note = notes[item.index];
          if (!note) {
            return null;
          }
          return (
            <div
              key={note.path}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start}px)`,
              }}
            >
              <div className="copper-note-list">
                <NoteRow
                  note={note}
                  selected={note.path === selectedPath}
                  onOpen={onOpen}
                  onPin={onPin}
                  fileActions={fileActions}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NoteRow({
  note,
  selected,
  onOpen,
  onPin,
  fileActions,
}: {
  note: SearchHit;
  selected: boolean;
  onOpen: (path: string) => void;
  onPin?: (path: string) => void;
  fileActions?: NoteFileActions;
}) {
  return (
    <NoteContextMenu path={note.path} actions={fileActions} onPin={onPin}>
      <button
        type="button"
        className="copper-note-row"
        data-selected={selected}
        aria-current={selected ? "true" : undefined}
        aria-label={note.title || note.path}
        onClick={() => onOpen(note.path)}
        onDoubleClick={() => onPin?.(note.path)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onPin) {
            event.preventDefault();
            onPin(note.path);
          }
        }}
      >
        <span className="copper-note-dot" aria-hidden="true" />
        <div className="copper-note-body">
          <div className="copper-note-title">{note.title || note.path}</div>
          <div className="copper-note-snippet">{note.snippet || note.path}</div>
          <div className="copper-note-meta">
            {note.tags.map((tag) => {
              const tone = pillTone(tag);
              return (
                <span
                  key={tag}
                  className="copper-chip"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  {tag}
                </span>
              );
            })}
            <span className="copper-note-time">
              {formatRelativeTime(note.mtimeNs)}
            </span>
          </div>
        </div>
      </button>
    </NoteContextMenu>
  );
}
