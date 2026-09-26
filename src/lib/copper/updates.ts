export type UpdateCheckResult =
  | { kind: "not-packaged" }
  | { kind: "unavailable" }
  | {
      kind: "available";
      version: string;
      currentVersion: string;
      notes: string | null;
    };

export function canCheckUpdates(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("preview")
  ) {
    return false;
  }
  return Boolean(window.copperDesktop?.packaged);
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
  void onProgress;
  if (!window.copperDesktop) {
    throw new Error("No pending update is available to download.");
  }
  await window.copperDesktop.invoke("download_update");
}

export async function installUpdate(): Promise<void> {
  if (!window.copperDesktop) {
    throw new Error("No pending update is available to install.");
  }
  await window.copperDesktop.invoke("install_update");
}

export async function relaunchApp(): Promise<void> {
  await window.copperDesktop?.invoke("relaunch_app");
}
