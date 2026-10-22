import { useState } from "react";

export function ExternalChangeBanner({
  visible,
  onReload,
  onKeep,
}: {
  visible: boolean;
  onReload: () => Promise<void>;
  onKeep: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!visible) return null;
  async function resolve(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The conflict could not be resolved. Your draft is kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="copper-conflict-banner" role="status">
      This file changed on disk. Autosave is paused until you choose a version.
      <button
        type="button"
        disabled={busy}
        onClick={() => void resolve(onReload)}
      >
        Reload Disk Version
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void resolve(onKeep)}
      >
        Keep Mine
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
