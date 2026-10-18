import { createRequire } from "node:module";
import { app } from "electron";
import {
  UPDATE_NOT_AVAILABLE_DOWNLOAD_MESSAGE,
  UPDATE_NOT_DOWNLOADED_INSTALL_MESSAGE,
  UPDATE_UNSUPPORTED_RUNTIME_MESSAGE,
} from "../../src/lib/updates/config";
import { RELEASE_UPDATES } from "../../src/lib/updates/release-policy";
import { isPackagedApp } from "./runtime";

type UpdateProgress = { transferred: number; total: number };
type UpdateEvent = {
  kind: "download-progress";
  received: number;
  total: number | null;
};
type UpdateEventHandler = (event: UpdateEvent) => void;

const { autoUpdater } = createRequire(import.meta.url)("electron-updater") as {
  autoUpdater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    on: (event: string, handler: (value: UpdateProgress) => void) => void;
    removeListener: (
      event: string,
      handler: (value: UpdateProgress) => void,
    ) => void;
    checkForUpdates: () => Promise<{
      isUpdateAvailable: boolean;
      updateInfo?: { version: string; releaseNotes?: unknown };
    } | null>;
    downloadUpdate: () => Promise<void>;
    quitAndInstall: () => void;
  };
};

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

const eventHandlers = new Set<UpdateEventHandler>();
let checkInFlight: Promise<UpdateCheckResult> | null = null;
let downloadInFlight: Promise<void> | null = null;
let installInFlight: Promise<void> | null = null;
let availableUpdate: Extract<UpdateCheckResult, { kind: "available" }> | null =
  null;
let downloadedVersion: string | null = null;

type UpdateCheckResult =
  | { kind: "not-packaged" }
  | { kind: "unavailable" }
  | {
      kind: "available";
      version: string;
      currentVersion: string;
      notes: string | null;
    };

function updaterSupported(): boolean {
  return (
    RELEASE_UPDATES.automatic &&
    process.platform === "darwin" &&
    isPackagedApp()
  );
}

autoUpdater.on("download-progress", (progress) => {
  const event: UpdateEvent = {
    kind: "download-progress",
    received: progress.transferred,
    total: Number.isFinite(progress.total) ? progress.total : null,
  };
  for (const handler of eventHandlers) handler(event);
});

// Check/download failures reject their command promises. A general listener is
// still required because EventEmitter "error" events without listeners crash
// the app. installUpdate adds a scoped listener so late native failures reach
// its pending IPC request.
autoUpdater.on("error", () => undefined);

export function onUpdateEvent(handler: UpdateEventHandler): () => void {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

export function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!updaterSupported()) {
    return Promise.resolve({ kind: "not-packaged" });
  }
  // Keep the version being staged stable. A renderer or native caller may
  // issue a check while the download is active; that result must not replace
  // the version associated with the in-flight download.
  if (downloadInFlight || downloadedVersion) {
    return Promise.resolve(availableUpdate ?? { kind: "unavailable" });
  }
  if (checkInFlight) return checkInFlight;

  const pending = autoUpdater
    .checkForUpdates()
    .then((result): UpdateCheckResult => {
      // A download can begin while a refresh is already in flight. In that
      // case, keep the previously selected version until the download settles.
      if (downloadInFlight || downloadedVersion) {
        return availableUpdate ?? { kind: "unavailable" };
      }
      const info = result?.updateInfo;
      if (!result?.isUpdateAvailable || !info) {
        availableUpdate = null;
        return { kind: "unavailable" };
      }
      availableUpdate = {
        kind: "available",
        version: info.version,
        currentVersion: app.getVersion(),
        notes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
      };
      return availableUpdate;
    })
    .finally(() => {
      checkInFlight = null;
    });
  checkInFlight = pending;
  return pending;
}

export function downloadUpdate(): Promise<void> {
  if (!updaterSupported()) {
    return Promise.reject(new Error(UPDATE_UNSUPPORTED_RUNTIME_MESSAGE));
  }
  if (!availableUpdate) {
    return Promise.reject(new Error(UPDATE_NOT_AVAILABLE_DOWNLOAD_MESSAGE));
  }
  if (downloadedVersion === availableUpdate.version) return Promise.resolve();
  if (downloadInFlight) return downloadInFlight;

  const version = availableUpdate.version;
  const pending = autoUpdater
    .downloadUpdate()
    .then(() => {
      downloadedVersion = version;
    })
    .finally(() => {
      downloadInFlight = null;
    });
  downloadInFlight = pending;
  return pending;
}

export function installUpdate(): Promise<void> {
  if (!updaterSupported()) {
    return Promise.reject(new Error(UPDATE_UNSUPPORTED_RUNTIME_MESSAGE));
  }
  if (!downloadedVersion) {
    return Promise.reject(new Error(UPDATE_NOT_DOWNLOADED_INSTALL_MESSAGE));
  }
  if (installInFlight) return installInFlight;

  let rejectInstall!: (error: unknown) => void;
  const pending = new Promise<void>((_resolve, reject) => {
    rejectInstall = reject;
  });
  installInFlight = pending;

  const cleanup = () => {
    autoUpdater.removeListener("error", onError);
    app.removeListener("before-quit", onBeforeQuit);
  };
  const onError = (error: unknown) => {
    cleanup();
    if (installInFlight === pending) installInFlight = null;
    rejectInstall(error instanceof Error ? error : new Error(String(error)));
  };
  const onBeforeQuit = () => {
    // A successful install quits Copper. Keep the promise pending until that
    // exit, but remove the temporary listeners as the process shuts down.
    cleanup();
  };

  autoUpdater.on("error", onError);
  app.on("before-quit", onBeforeQuit);
  try {
    autoUpdater.quitAndInstall();
  } catch (error) {
    cleanup();
    if (installInFlight === pending) installInFlight = null;
    rejectInstall(error);
  }
  return pending;
}
