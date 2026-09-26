export function parsePreviewFrontmatter(
  files: Map<string, string>,
  path: string,
) {
  const content = files.get(path) ?? "";
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  const raw = match?.[1] ?? "";
  const values: Record<string, unknown> = {};
  let currentList: string | undefined;
  for (const line of raw.split("\n")) {
    const listItem = /^\s+-\s+(.+)$/.exec(line);
    if (listItem && currentList) {
      (values[currentList] as string[]).push(listItem[1]);
      continue;
    }
    const pair = /^([^:]+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const key = pair[1].trim();
    const value = pair[2].trim();
    if (!value) {
      values[key] = [];
      currentList = key;
      continue;
    }
    try {
      values[key] = /^[[{]/.test(value) ? JSON.parse(value) : value;
    } catch {
      values[key] = value;
    }
    currentList = undefined;
  }
  return {
    raw,
    body: match ? content.slice(match[0].length) : content,
    values,
  };
}

export function serializePreviewFrontmatter(values: Record<string, unknown>) {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      if (value.some((item) => typeof item === "object")) {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        lines.push(`${key}:`, ...value.map((item) => `  - ${String(item)}`));
      }
    } else {
      lines.push(`${key}: ${String(value ?? "")}`);
    }
  }
  return lines.join("\n");
}

export function writePreviewMarkdown(
  files: Map<string, string>,
  path: string,
  values: Record<string, unknown>,
  body: string,
) {
  files.set(path, `---\n${serializePreviewFrontmatter(values)}\n---\n${body}`);
}
