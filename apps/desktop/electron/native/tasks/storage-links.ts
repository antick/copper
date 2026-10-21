import path from "node:path";
import { parser } from "@lezer/markdown";

export interface TaskPathMove {
  from: string;
  to: string;
}

/** Rewrite actual Markdown/wiki targets, leaving code and frontmatter alone. */
export function rewriteTaskLinks(
  source: string,
  from: string,
  to: string,
  moves: TaskPathMove[],
): string {
  const prefix =
    source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] ?? "";
  const body = source.slice(prefix.length);
  const mapping = new Map(moves.map((move) => [move.from, move.to]));
  const replacements: Array<{ from: number; to: number; text: string }> = [];
  const code: Array<{ from: number; to: number }> = [];
  function target(raw: string, wiki: boolean) {
    if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(raw)) return raw;
    const angle = raw.startsWith("<") && raw.endsWith(">");
    const value = angle ? raw.slice(1, -1) : raw;
    const split = value.search(/[?#]/);
    const address = split < 0 ? value : value.slice(0, split);
    const suffix = split < 0 ? "" : value.slice(split);
    let decoded: string;
    try {
      decoded = decodeURIComponent(address);
    } catch {
      return raw;
    }
    const rooted = decoded.startsWith("/");
    const direct = decoded.replace(/^\//, "");
    const base = path.posix.normalize(
      path.posix.join(path.posix.dirname(from), direct),
    );
    const directKey = mapping.has(direct)
      ? direct
      : wiki && mapping.has(`${direct}.md`)
        ? `${direct}.md`
        : undefined;
    const relativeKey = mapping.has(base) ? base : undefined;
    const key = directKey ?? relativeKey;
    if (wiki && !key) return raw;
    // Copper attachments use Vault-relative paths; only explicit ./ or ../
    // targets need rebasing when their containing task file moves.
    if (!key && (from === to || rooted || !/^\.\.?\//.test(decoded)))
      return raw;
    const destination = key ? (mapping.get(key) as string) : base;
    let next =
      directKey || rooted
        ? `${rooted ? "/" : ""}${destination}`
        : path.posix.relative(path.posix.dirname(to), destination);
    if (wiki && !/\.(md|markdown)$/i.test(decoded))
      next = next.replace(/\.md$/i, "");
    if (address.includes("%"))
      next = next.split("/").map(encodeURIComponent).join("/");
    return `${angle ? "<" : ""}${next}${suffix}${angle ? ">" : ""}`;
  }
  parser.parse(body).iterate({
    enter(node) {
      if (["InlineCode", "FencedCode", "CodeBlock"].includes(node.name)) {
        code.push({ from: node.from, to: node.to });
        return false;
      }
      if (node.name === "URL") {
        const raw = body.slice(node.from, node.to);
        const text = target(raw, false);
        if (text !== raw)
          replacements.push({ from: node.from, to: node.to, text });
      }
    },
  });
  for (const match of body.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const start = match.index ?? 0;
    if (code.some((range) => start >= range.from && start < range.to)) continue;
    const [raw, ...alias] = match[1].split("|");
    const text = target(raw, true);
    if (text !== raw)
      replacements.push({
        from: start,
        to: start + match[0].length,
        text: `[[${text}${alias.length ? `|${alias.join("|")}` : ""}]]`,
      });
  }
  let result = body;
  for (const replacement of replacements.sort((a, b) => b.from - a.from))
    result =
      result.slice(0, replacement.from) +
      replacement.text +
      result.slice(replacement.to);
  return prefix + result;
}
