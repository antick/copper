const PALETTE = [
  { bg: "var(--pill-blue-bg)", fg: "var(--pill-blue-fg)" },
  { bg: "var(--pill-green-bg)", fg: "var(--pill-green-fg)" },
  { bg: "var(--pill-orange-bg)", fg: "var(--pill-orange-fg)" },
  { bg: "var(--pill-purple-bg)", fg: "var(--pill-purple-fg)" },
  { bg: "var(--pill-red-bg)", fg: "var(--pill-red-fg)" },
] as const;

export function pillTone(value: string) {
  const key = value.trim().toLowerCase();
  if (
    key.includes("essay") ||
    key.includes("note") ||
    key.includes("evergreen")
  ) {
    return key.includes("ever")
      ? { bg: "var(--pill-orange-bg)", fg: "var(--pill-orange-fg)" }
      : { bg: "var(--pill-green-bg)", fg: "var(--pill-green-fg)" };
  }
  if (key.includes("draft") || key.includes("inbox")) {
    return { bg: "var(--pill-orange-bg)", fg: "var(--pill-orange-fg)" };
  }
  if (key.includes("archive")) {
    return { bg: "var(--pill-red-bg)", fg: "var(--pill-red-fg)" };
  }
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0];
}

export function extractWikiLinks(markdown: string) {
  const links: string[] = [];
  const pattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  for (const match of markdown.matchAll(pattern)) {
    const name = match[1]?.trim();
    if (name && !links.includes(name)) {
      links.push(name);
    }
  }
  return links;
}
