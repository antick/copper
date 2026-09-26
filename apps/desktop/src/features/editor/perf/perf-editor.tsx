import type { EditorView } from "@codemirror/view";
import { useLayoutEffect, useRef } from "react";
import { createCopperEditor } from "@/features/editor/create-editor";

export interface PerfEditorProps {
  doc: string;
  onReady?: (view: EditorView) => void;
}

export function PerfEditor({ doc, onReady }: PerfEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const view = createCopperEditor({ parent: host, doc });
    viewRef.current = view;
    onReady?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [doc, onReady]);

  return (
    <div
      ref={hostRef}
      className="copper-editor-host"
      data-testid="copper-editor"
    />
  );
}
