import { useRef, useState } from "react";
import { SettingsButton } from "@/features/settings/settings-controls";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import "./file-name-dialog.css";

interface NameRequest {
  title: string;
  label: string;
  initialValue?: string;
  description?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
  onReturnFocus?: () => void;
}

export function useFileNameDialog() {
  const [request, setRequest] = useState<NameRequest | null>(null);
  return {
    requestName: setRequest,
    nameDialog: request ? (
      <FileNameDialog request={request} onClose={() => setRequest(null)} />
    ) : null,
  };
}

function FileNameDialog({
  request,
  onClose,
}: {
  request: NameRequest;
  onClose: () => void;
}) {
  const [value, setValue] = useState(request.initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  async function submit() {
    if (pending.current || !value.trim()) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await request.onSubmit(value.trim());
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The file operation failed. Please try again.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <SettingsDialog
      title={request.title}
      description={request.description ?? "Choose a name in this Vault."}
      open
      initialFocusRef={input}
      onReturnFocus={request.onReturnFocus}
      onOpenChange={(open) => {
        if (!open && !pending.current) onClose();
      }}
    >
      <form
        className="copper-file-name-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label>
          {request.label}
          <input
            ref={input}
            autoFocus
            value={value}
            disabled={saving}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <footer>
          <button
            type="button"
            className="copper-text-button"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <SettingsButton type="submit" disabled={saving || !value.trim()}>
            {saving ? "Saving…" : request.submitLabel}
          </SettingsButton>
        </footer>
      </form>
    </SettingsDialog>
  );
}
