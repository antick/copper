export function formatRelativeTime(mtimeNs: number, now = Date.now()) {
  if (!mtimeNs) {
    return "";
  }
  const date = new Date(mtimeNs / 1_000_000);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const delta = Math.max(0, now - date.getTime());
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatPropertyDate(value: unknown) {
  const raw = String(value ?? "");
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
