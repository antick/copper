import { parseFrontmatter, writeFrontmatter } from "../markdown/frontmatter";
import { readFile, saveFile } from "./service";

export function updateProperties(
  root: string,
  path: string,
  values: Record<string, unknown>,
) {
  const [source, revision] = readFile(root, path);
  const current = parseFrontmatter(source);
  const next = writeFrontmatter(
    { ...current, values: { ...current.values, ...values } },
    source,
  );
  return [
    next,
    next === source ? revision : saveFile(root, path, next, revision.hash),
  ] as const;
}
