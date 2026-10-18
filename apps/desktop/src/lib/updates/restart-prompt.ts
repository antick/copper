export function confirmRestart(version: string): boolean {
  return window.confirm(
    `Save open documents and restart Copper to update to ${version}?`,
  );
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
