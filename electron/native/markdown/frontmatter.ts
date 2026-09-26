import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { CopperError } from "../errors";

export interface Frontmatter {
  raw: string;
  body: string;
  values: Record<string, unknown>;
}

export function parseFrontmatter(source: string): Frontmatter {
  if (!source.startsWith("---")) {
    return { raw: "", body: source, values: {} };
  }
  const rest = source.slice(3);
  const end = rest.indexOf("\n---");
  if (end < 0) {
    throw CopperError.invalid("Malformed YAML frontmatter");
  }
  const raw = rest.slice(0, end).replace(/^\n+|\n+$/g, "");
  const body = rest.slice(end + 4).replace(/^\n/, "");
  try {
    const parsed = parseYaml(raw);
    const values =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { raw, body, values };
  } catch (error) {
    throw CopperError.invalid(
      `Malformed YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function writeFrontmatter(
  frontmatter: Frontmatter,
  original: string,
): string {
  if (
    Object.keys(frontmatter.values).length === 0 &&
    frontmatter.raw.length === 0
  ) {
    return frontmatter.body;
  }
  const yaml = stringifyYaml(frontmatter.values);
  const next = `---\n${yaml}---\n${frontmatter.body}`;
  return next === original ? original : next;
}
