interface PaneResizerProps {
  cssVar: string;
  min: number;
  max: number;
  invert?: boolean;
  lineBelowHeader?: boolean;
}

function readCssPx(name: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function PaneResizer({
  cssVar,
  min,
  max,
  invert = false,
  lineBelowHeader = false,
}: PaneResizerProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="copper-resizer"
      data-line-below-header={lineBelowHeader || undefined}
      onPointerDown={(event) => {
        event.preventDefault();
        const pointerId = event.pointerId;
        const originX = event.clientX;
        const originWidth = readCssPx(cssVar, min);
        const target = event.currentTarget;
        target.setPointerCapture(pointerId);

        const onMove = (moveEvent: PointerEvent) => {
          const next = Math.min(
            max,
            Math.max(
              min,
              originWidth +
                (invert
                  ? originX - moveEvent.clientX
                  : moveEvent.clientX - originX),
            ),
          );
          document.documentElement.style.setProperty(cssVar, `${next}px`);
        };
        const onUp = () => {
          target.releasePointerCapture(pointerId);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      }}
    />
  );
}
