import { useRef } from "react";
import {
  ISSUE_COLUMN_MAX_WIDTH,
  ISSUE_COLUMN_MIN_WIDTH,
  ISSUE_COLUMN_WIDTHS,
  type IssueColumnId,
} from "@/lib/copper/task-settings";

function clampWidth(width: number) {
  return Math.min(
    ISSUE_COLUMN_MAX_WIDTH,
    Math.max(ISSUE_COLUMN_MIN_WIDTH, Math.round(width)),
  );
}

export function IssueColumnHeader({
  id,
  label,
  width,
  onChange,
  onReset,
}: {
  id: IssueColumnId;
  label: string;
  width: number;
  onChange: (width: number) => void;
  onReset: () => void;
}) {
  const drag = useRef<
    { pointerId: number; x: number; width: number } | undefined
  >(undefined);
  return (
    <th style={{ width }} data-column-id={id} aria-label={label}>
      <span>{label}</span>
      <span
        role="separator"
        tabIndex={0}
        className="copper-task-column-resizer"
        aria-label={`Resize ${label} column`}
        aria-orientation="vertical"
        aria-valuemin={ISSUE_COLUMN_MIN_WIDTH}
        aria-valuemax={ISSUE_COLUMN_MAX_WIDTH}
        aria-valuenow={width}
        onDoubleClick={onReset}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            width,
          };
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (current?.pointerId === event.pointerId)
            onChange(clampWidth(current.width + event.clientX - current.x));
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          drag.current = undefined;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 24 : 8;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            onChange(
              clampWidth(width + (event.key === "ArrowRight" ? step : -step)),
            );
          } else if (event.key === "Home") {
            event.preventDefault();
            onReset();
          }
        }}
      />
    </th>
  );
}

export function issueColumnWidth(
  id: IssueColumnId,
  widths: Partial<Record<IssueColumnId, number>>,
) {
  return widths[id] ?? ISSUE_COLUMN_WIDTHS[id];
}
