import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsDialog } from "@/features/settings/settings-dialog";

export type SaveTaskLabels = (labels: string[]) => Promise<unknown>;
export type OpenTaskLabels = (
  initialValue: string,
  onSave: SaveTaskLabels,
  focusFallback?: () => HTMLElement | null,
) => void;

interface TaskLabelRequest {
  initialValue: string;
  onSave: SaveTaskLabels;
}

export function taskIssueFocusTarget(id: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("[data-issue-id]")).find(
      (element) => element.dataset.issueId === id,
    ) ?? null
  );
}

export function parseTaskLabels(value: string): string[] {
  return value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

export function useTaskLabelDialog() {
  const [request, setRequest] = useState<TaskLabelRequest | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusFallbackRef = useRef<(() => HTMLElement | null) | undefined>(
    undefined,
  );

  const openLabels = useCallback<OpenTaskLabels>(
    (initialValue, onSave, focusFallback) => {
      const active = document.activeElement;
      returnFocusRef.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      focusFallbackRef.current = focusFallback;
      setRequest({ initialValue, onSave });
    },
    [],
  );

  const close = useCallback(() => setRequest(null), []);
  const returnFocus = useCallback(() => {
    const active = returnFocusRef.current;
    const target = active?.isConnected ? active : focusFallbackRef.current?.();
    if (target?.isConnected) target.focus();
    returnFocusRef.current = null;
    focusFallbackRef.current = undefined;
  }, []);

  return {
    openLabels,
    dialog: request ? (
      <TaskLabelDialog
        initialValue={request.initialValue}
        onSave={request.onSave}
        onClose={close}
        onReturnFocus={returnFocus}
      />
    ) : null,
  };
}

function TaskLabelDialog({
  initialValue,
  onSave,
  onClose,
  onReturnFocus,
}: TaskLabelRequest & { onClose: () => void; onReturnFocus: () => void }) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
    setError(null);
  }, [initialValue]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(parseTaskLabels(value));
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Could not update labels. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsDialog
      title="Edit issue labels"
      description="Enter labels separated by commas."
      open
      onOpenChange={(open) => !open && onClose()}
      onReturnFocus={onReturnFocus}
      initialFocusRef={inputRef}
    >
      <form onSubmit={(event) => void submit(event)}>
        <label className="copper-task-form-field">
          <span>Labels</span>
          <input
            ref={inputRef}
            aria-label="Labels"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <footer className="copper-task-create-actions">
          <button
            type="button"
            className="copper-text-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="copper-task-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save labels"}
          </button>
        </footer>
      </form>
    </SettingsDialog>
  );
}
