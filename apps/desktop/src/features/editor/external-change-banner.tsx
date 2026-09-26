import { useEffect, useState } from "react";
import { isRecentCopperSave, subscribeToVaultFs } from "@/lib/copper/events";

export function ExternalChangeBanner({
  vaultId,
  path,
  dirty,
  onReload,
  onKeep,
}: {
  vaultId: string;
  path: string;
  dirty: boolean;
  onReload: () => void;
  onKeep: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stop = subscribeToVaultFs((payload) => {
      const matches =
        ("path" in payload && payload.path === path) ||
        (payload.type === "renamed" &&
          (payload.from === path || payload.to === path));
      if (matches && dirty && !isRecentCopperSave(vaultId, path)) {
        setVisible(true);
      }
    });
    return () => {
      stop();
    };
  }, [dirty, path, vaultId]);

  if (!visible) {
    return null;
  }

  return (
    <div className="copper-conflict-banner" role="status">
      {dirty
        ? "This file changed on disk while you have unsaved edits."
        : "This file changed on disk."}
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onReload();
        }}
      >
        Reload Disk Version
      </button>
      {dirty ? (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onKeep();
          }}
        >
          Keep Mine
        </button>
      ) : null}
      <button type="button" onClick={() => setVisible(false)}>
        Dismiss
      </button>
    </div>
  );
}
