import {
  SettingsButton,
  SettingsRow,
  SettingsSection,
} from "@/features/settings/settings-controls";
import { UpdateFailureDetails } from "@/features/updates/update-failure-details";
import { useUpdates } from "@/features/updates/update-provider";
import { RELEASE_UPDATES } from "@/lib/updates/release-policy";
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
    case "saving":
      return `Saving open documents before restarting to install ${status.version}…`;
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
  const restarting = status.kind === "saving" || status.kind === "restarting";

  if (!RELEASE_UPDATES.automatic) {
    return (
      <SettingsSection title="Updates">
        <p>{RELEASE_UPDATES.message}</p>
        <a href={RELEASE_UPDATES.url}>Open Copper releases</a>
      </SettingsSection>
    );
  }

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
            disabled={checking || downloading || restarting}
            onClick={() => void checkNow()}
          >
            {checking ? "Checking…" : "Check for updates"}
          </SettingsButton>
        }
      />
      {status.kind === "available" ? (
        <SettingsRow
          label="Download update"
          control={
            <SettingsButton
              disabled={downloading}
              onClick={() => void startUpdate()}
            >
              {downloading ? "Downloading…" : "Download update"}
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
