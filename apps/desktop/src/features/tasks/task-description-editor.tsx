import {
  Bold,
  Code2,
  Heading2,
  Italic,
  Link2,
  List,
  ListTodo,
  type LucideIcon,
  Quote,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { createCopperEditor } from "@/features/editor/create-editor";
import {
  applyMarkdownFormat,
  type MarkdownFormat,
} from "@/features/editor/markdown-format";
import { useDocumentSave } from "@/features/editor/use-document-save";

const FORMAT_ACTIONS: Array<{
  format: MarkdownFormat;
  label: string;
  shortcut?: string;
  icon: LucideIcon;
}> = [
  { format: "bold", label: "Bold", shortcut: "⌘B", icon: Bold },
  { format: "italic", label: "Italic", shortcut: "⌘I", icon: Italic },
  { format: "heading", label: "Heading", icon: Heading2 },
  { format: "link", label: "Link", shortcut: "⌘K", icon: Link2 },
  { format: "list", label: "List", icon: List },
  { format: "task", label: "Task", icon: ListTodo },
  { format: "quote", label: "Quote", icon: Quote },
  { format: "code", label: "Code", icon: Code2 },
];

type SaveState = "draft" | "dirty" | "saving" | "saved" | "error";

export interface TaskDescriptionEditorHandle {
  focus: () => void;
  flush: () => Promise<void>;
  getValue: () => string;
}

export const TaskDescriptionEditor = forwardRef<
  TaskDescriptionEditorHandle,
  {
    documentId: string;
    body: string;
    ariaLabel: string;
    compact?: boolean;
    onSave?: (contents: string) => Promise<void>;
  }
>(function TaskDescriptionEditor(
  { documentId, body, ariaLabel, compact = false, onSave },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ReturnType<typeof createCopperEditor> | null>(null);
  const mountedId = useRef(documentId);
  const initialBody = useRef(body);
  if (mountedId.current !== documentId) {
    mountedId.current = documentId;
    initialBody.current = body;
  }
  const persisted = Boolean(onSave);
  const [saveState, setSaveState] = useState<SaveState>(
    onSave ? "saved" : "draft",
  );
  const scheduleSave = useDocumentSave(async (contents) => {
    if (!onSave) return;
    setSaveState("saving");
    try {
      await onSave(contents);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      throw error;
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => viewRef.current?.focus(),
      flush: scheduleSave.flush,
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
    }),
    [scheduleSave.flush],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = createCopperEditor({
      parent: host,
      doc: initialBody.current,
      path: documentId,
      mode: "markdown",
      ariaLabel,
      placeholder: "Add context, links, checklists, or acceptance criteria…",
      onDocChanged: (contents) => {
        if (!persisted) return setSaveState("draft");
        setSaveState("dirty");
        scheduleSave(contents);
      },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel, documentId, persisted, scheduleSave]);

  return (
    <section
      className="copper-task-description-shell"
      data-compact={compact || undefined}
      data-save-state={saveState}
      data-testid="task-description-editor"
    >
      <div
        role="toolbar"
        className="copper-task-description-toolbar"
        aria-label="Markdown formatting"
      >
        {FORMAT_ACTIONS.map(({ format, label, shortcut, icon: Icon }) => (
          <Tooltip
            key={format}
            content={shortcut ? `${label} ${shortcut}` : label}
          >
            <button
              type="button"
              aria-label={label}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                const view = viewRef.current;
                if (view) applyMarkdownFormat(view, format);
              }}
            >
              <Icon size={14} strokeWidth={1.8} aria-hidden />
            </button>
          </Tooltip>
        ))}
        <span
          className="copper-task-description-status"
          role="status"
          aria-live="polite"
        >
          {saveState === "error" ? "Save failed" : capitalize(saveState)}
        </span>
        {saveState === "error" ? (
          <button
            type="button"
            className="copper-task-description-retry"
            onClick={() => void scheduleSave.flush().catch(() => undefined)}
          >
            Retry
          </button>
        ) : null}
      </div>
      <div ref={hostRef} className="copper-task-description" />
    </section>
  );
});

function capitalize(value: SaveState) {
  return value[0]?.toUpperCase() + value.slice(1);
}
