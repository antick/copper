import {
  UPDATE_EVENT_CHANNEL,
  UPDATE_NOT_AVAILABLE_DOWNLOAD_MESSAGE,
  UPDATE_NOT_DOWNLOADED_INSTALL_MESSAGE,
} from "@/lib/updates/config";
import { RELEASE_UPDATES } from "@/lib/updates/release-policy";

export type UpdateCheckResult =
  | { kind: "not-packaged" }
  | { kind: "unavailable" }
  | {
      kind: "available";
      version: string;
      currentVersion: string;
      notes: string | null;
    };

type UpdateProgressEvent = {
  kind: "download-progress";
  received: number;
  total: number | null;
};

function isUpdateProgressEvent(value: unknown): value is UpdateProgressEvent {
  return (
    value !== null &&
    typeof value === "object" &&
    "kind" in value &&
    value.kind === "download-progress" &&
    "received" in value &&
    typeof value.received === "number" &&
    Number.isFinite(value.received) &&
    value.received >= 0 &&
    "total" in value &&
    (value.total === null ||
      (typeof value.total === "number" &&
        Number.isFinite(value.total) &&
        value.total >= 0))
  );
}

export function canCheckUpdates(): boolean {
  if (!RELEASE_UPDATES.automatic || typeof window === "undefined") {
    return false;
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("preview")
  ) {
    return false;
  }
  return Boolean(
    window.copperDesktop?.packaged && window.copperDesktop.updatesSupported,
  );
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!canCheckUpdates() || !window.copperDesktop) {
    return { kind: "not-packaged" };
  }
  return window.copperDesktop.invoke<UpdateCheckResult>("check_for_update");
}

export async function downloadUpdate(
  onProgress: (received: number, total: number | null) => void,
): Promise<void> {
  if (!canCheckUpdates() || !window.copperDesktop) {
    throw new Error(UPDATE_NOT_AVAILABLE_DOWNLOAD_MESSAGE);
  }
  const unsubscribe = window.copperDesktop.on(
    UPDATE_EVENT_CHANNEL,
    (payload) => {
      if (isUpdateProgressEvent(payload)) {
        onProgress(payload.received, payload.total);
      }
    },
  );
  try {
    await window.copperDesktop.invoke("download_update");
  } finally {
    unsubscribe();
  }
}

export async function installUpdate(): Promise<void> {
  if (!canCheckUpdates() || !window.copperDesktop) {
    throw new Error(UPDATE_NOT_DOWNLOADED_INSTALL_MESSAGE);
  }
  await window.copperDesktop.invoke("install_update");
}
