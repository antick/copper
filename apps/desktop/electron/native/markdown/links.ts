export function parseWikiLink(raw: string): [string, string | undefined] {
  const hash = raw.indexOf("#");
  if (hash >= 0) {
    return [raw.slice(0, hash), raw.slice(hash + 1)];
  }
  return [raw, undefined];
}
