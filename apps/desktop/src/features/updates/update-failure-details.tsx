import type { UpdateStatus } from "@/features/updates/update-provider";

type UpdateFailure = Extract<UpdateStatus, { kind: "error" }>;

export function UpdateFailureDetails({
  failure,
  onRetry,
  onClose,
}: {
  failure: UpdateFailure;
  onRetry: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="copper-update-failure" role="alert">
      <p>{failure.summary}</p>
      {failure.version ? <span>Version {failure.version}</span> : null}
      <details>
        <summary>Technical details</summary>
        <pre>{failure.detail}</pre>
        <button
          type="button"
          className="copper-text-button"
          onClick={() => void navigator.clipboard?.writeText(failure.detail)}
        >
          Copy details
        </button>
      </details>
      <div className="copper-update-failure-actions">
        {onClose ? (
          <button
            type="button"
            className="copper-text-button"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
        <button
          type="button"
          className="copper-settings-action"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
