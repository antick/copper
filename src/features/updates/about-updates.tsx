import {
  SettingsButton,
  SettingsRow,
  SettingsSection,
} from "@/features/settings/settings-controls";
import { UpdateFailureDetails } from "@/features/updates/update-failure-details";
import { useUpdates } from "@/features/updates/update-provider";
import { updateProgressPercent } from "@/lib/updates/restart-prompt";

function aboutStatusCopy(
  status: ReturnType<typeof useUpdates>["status"],
): string {
  switch (status.kind) {
    case "checking":
      return "Checking for updates…";
    case "up-to-date":
      return "Copper is up to date.";
    case "available":
      return `Version ${status.version} is available.`;
    case "downloading": {
      const percent = updateProgressPercent(status.received, status.total);
      return percent == null
        ? `Downloading ${status.version}…`
        : `Downloading ${status.version}… ${percent}%`;
    }
    case "ready":
      return `Version ${status.version} is ready. Restart to finish the update.`;
    case "restarting":
      return `Restarting to install ${status.version}…`;
    case "error":
      return status.summary;
    default:
      return "Updates are checked automatically in the packaged app.";
  }
}

export function AboutUpdates() {
  const { status, checkNow, startUpdate, requestRestart, retryUpdate } =
    useUpdates();
  const checking = status.kind === "checking";
  const downloading = status.kind === "downloading";

  return (
    <SettingsSection title="Updates">
      <SettingsRow
        label="Status"
        control={
          <span className="copper-update-status-copy">
            {aboutStatusCopy(status)}
          </span>
        }
      />
      {status.kind === "error" ? (
        <UpdateFailureDetails
          failure={status}
          onRetry={() => void retryUpdate()}
        />
      ) : null}
      <SettingsRow
        label="Check now"
        control={
          <SettingsButton
            disabled={checking || downloading}
            onClick={() => void checkNow()}
          >
            {checking ? "Checking…" : "Check for updates"}
          </SettingsButton>
        }
      />
      {status.kind === "available" ? (
        <SettingsRow
          label="Install update"
          control={
            <SettingsButton
              disabled={downloading}
              onClick={() => void startUpdate()}
            >
              {downloading ? "Downloading…" : "Download and install"}
            </SettingsButton>
          }
        />
      ) : null}
      {status.kind === "ready" ? (
        <SettingsRow
          label="Finish update"
          control={
            <SettingsButton onClick={() => void requestRestart()}>
              Restart and update
            </SettingsButton>
          }
        />
      ) : null}
    </SettingsSection>
  );
}
