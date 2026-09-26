import { hasDirtyDocuments } from "@/lib/copper/events";

export function confirmRestart(
  version: string,
  dirty = hasDirtyDocuments(),
): boolean {
  if (dirty) {
    return window.confirm(
      `You have unsaved changes. Restart and update to ${version}? Unsaved edits will be lost.`,
    );
  }
  return window.confirm(`Restart and update to ${version}?`);
}

export function updateProgressPercent(
  received: number,
  total: number | null,
): number | null {
  if (!total || total <= 0) {
    return null;
  }
  return Math.min(100, Math.round((received / total) * 100));
}
