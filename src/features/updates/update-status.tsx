import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { UpdateFailureDetails } from "@/features/updates/update-failure-details";
import { useUpdates } from "@/features/updates/update-provider";
import { updateProgressPercent } from "@/lib/updates/restart-prompt";

export function updateStatusLabel(
  status: ReturnType<typeof useUpdates>["status"],
): string | null {
  switch (status.kind) {
    case "available":
      return `Update ${status.version} available`;
    case "downloading": {
      const percent = updateProgressPercent(status.received, status.total);
      return percent == null
        ? "Downloading update…"
        : `Downloading update ${percent}%`;
    }
    case "ready":
    case "restarting":
      return `Restart to finish ${status.version}`;
    case "error":
      return status.version
        ? `Update ${status.version} failed`
        : "Update failed";
    default:
      return null;
  }
}

export function UpdateStatusControl() {
  const { status, startUpdate, requestRestart, retryUpdate } = useUpdates();
  const [failureOpen, setFailureOpen] = useState(false);
  const label = updateStatusLabel(status);
  if (!label) {
    return null;
  }

  const busy = status.kind === "downloading" || status.kind === "restarting";
  if (status.kind === "error") {
    return (
      <Dialog.Root open={failureOpen} onOpenChange={setFailureOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="copper-status-update">
            {label}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="copper-git-review-overlay" />
          <Dialog.Content
            className="copper-update-failure-dialog"
            aria-describedby={undefined}
          >
            <Dialog.Title>Update failed</Dialog.Title>
            <UpdateFailureDetails
              failure={status}
              onRetry={() => void retryUpdate()}
              onClose={() => setFailureOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
  return (
    <button
      type="button"
      className="copper-status-update"
      disabled={busy}
      onClick={() => {
        if (status.kind === "ready") {
          void requestRestart();
          return;
        }
        void startUpdate();
      }}
    >
      {label}
    </button>
  );
}
