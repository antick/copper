import { createRequire } from "node:module";
import { app } from "electron";
import { UPDATE_CHECK_INTERVAL_MS } from "../native/constants";
import { isPackagedApp } from "./runtime";

const { autoUpdater } = createRequire(import.meta.url)("electron-updater") as {
  autoUpdater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    checkForUpdates: () => Promise<{
      updateInfo?: { version: string; releaseNotes?: unknown };
    } | null>;
    downloadUpdate: () => Promise<void>;
    quitAndInstall: () => void;
  };
};

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export function startUpdateChecks(): void {
  if (!isPackagedApp()) {
    return;
  }
  const check = () => {
    // Background failures must not become unhandled rejections. Manual checks
    // still return errors through the bridge so the UI can offer a retry.
    void autoUpdater.checkForUpdates().catch(() => undefined);
  };
  check();
  setInterval(() => {
    check();
  }, UPDATE_CHECK_INTERVAL_MS);
}

export async function checkForUpdate(): Promise<
  | { kind: "not-packaged" }
  | { kind: "unavailable" }
  | {
      kind: "available";
      version: string;
      currentVersion: string;
      notes: string | null;
    }
> {
  if (!isPackagedApp()) {
    return { kind: "not-packaged" };
  }
  const result = await autoUpdater.checkForUpdates();
  const info = result?.updateInfo;
  if (!info || info.version === app.getVersion()) {
    return { kind: "unavailable" };
  }
  return {
    kind: "available",
    version: info.version,
    currentVersion: app.getVersion(),
    notes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
  };
}

export async function downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate();
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
