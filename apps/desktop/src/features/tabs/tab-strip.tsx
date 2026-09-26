import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function tabDropEdge(
  clientX: number,
  rect: { left: number; width: number },
): "before" | "after" {
  return clientX < rect.left + rect.width / 2 ? "before" : "after";
}

export interface WorkspaceTab {
  id: string;
  label: string;
  preview?: boolean;
}

export function TabStrip({
  tabs,
  activeId,
  ariaLabel = "Open notes",
  onActivate,
  onPin,
  onClose,
  onReorder,
}: {
  tabs: WorkspaceTab[];
  activeId?: string;
  ariaLabel?: string;
  onActivate: (id: string) => void;
  onPin: (id: string) => void;
  onClose: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const draggedIndex = useRef<number | null>(null);
  const [dropHint, setDropHint] = useState<{
    id: string;
    edge: "before" | "after";
  } | null>(null);
  useEffect(() => {
    if (!activeId) return;
    activeRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId]);

  return (
    <div
      className="copper-tab-strip"
      role="tablist"
      aria-label={ariaLabel}
      data-copper-drag-region
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${tab.label}, press Delete to close`}
            className="copper-tab"
            data-active={active}
            data-preview={tab.preview}
            tabIndex={active ? 0 : -1}
            draggable={Boolean(onReorder)}
            data-drop-edge={dropHint?.id === tab.id ? dropHint.edge : undefined}
            onDragStart={() => {
              draggedIndex.current = index;
            }}
            onDragOver={(event) => {
              if (!onReorder) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              setDropHint({
                id: tab.id,
                edge: tabDropEdge(event.clientX, rect),
              });
            }}
            onDragEnd={() => {
              draggedIndex.current = null;
              setDropHint(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedIndex.current != null)
                onReorder?.(draggedIndex.current, index);
              draggedIndex.current = null;
              setDropHint(null);
            }}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("[data-tab-close]")) {
                onClose(tab.id);
              } else {
                onActivate(tab.id);
              }
            }}
            onDoubleClick={(event) => {
              const target = event.target as HTMLElement;
              if (!target.closest("[data-tab-close]")) {
                onPin(tab.id);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Delete") {
                event.preventDefault();
                onClose(tab.id);
              } else if (
                event.altKey &&
                (event.key === "ArrowLeft" || event.key === "ArrowRight")
              ) {
                event.preventDefault();
                const to =
                  event.key === "ArrowLeft"
                    ? Math.max(0, index - 1)
                    : Math.min(tabs.length - 1, index + 1);
                onReorder?.(index, to);
              }
            }}
          >
            <span className="copper-tab-label">{tab.label}</span>
            <span
              className="copper-tab-close"
              data-tab-close
              aria-hidden="true"
              title={`Close ${tab.label}`}
            >
              <X size={12} strokeWidth={1.75} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
