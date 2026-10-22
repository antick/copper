import { type RefObject, useRef, useState } from "react";
import { fileStem } from "@/lib/paths";

export function DocumentTitle({
  path,
  onRename,
  buttonRef,
}: {
  path: string;
  onRename?: (name: string) => Promise<void> | void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fileStem(path));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const cancelled = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleButton = buttonRef ?? button;
  async function save(returnFocus = false) {
    if (pending.current || cancelled.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error("Enter a note title.");
      if (name.trim() !== fileStem(path)) await onRename?.(name.trim());
      setEditing(false);
      if (returnFocus)
        requestAnimationFrame(() => titleButton.current?.focus());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn’t rename this file.",
      );
      if (returnFocus) requestAnimationFrame(() => input.current?.focus());
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <div className="copper-document-title">
      <h1 className="copper-title-heading" aria-label={fileStem(path)}>
        {editing ? (
          <input
            ref={input}
            className="copper-title-input"
            aria-label="Note title"
            autoFocus
            value={name}
            disabled={saving}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save(true);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelled.current = true;
                setError(null);
                setEditing(false);
                queueMicrotask(() => titleButton.current?.focus());
              }
            }}
          />
        ) : onRename ? (
          <button
            ref={titleButton}
            className="copper-title-button"
            type="button"
            aria-label="Rename note"
            onClick={() => {
              cancelled.current = false;
              setName(fileStem(path));
              setError(null);
              setEditing(true);
            }}
          >
            {fileStem(path)}
          </button>
        ) : (
          fileStem(path)
        )}
      </h1>
      {error ? (
        <p className="copper-title-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
