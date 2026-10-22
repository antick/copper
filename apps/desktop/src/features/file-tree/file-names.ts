import { fileName } from "@/lib/paths";

export const UNTITLED_NOTE = "Untitled";

export function childPath(parent: string, input: string) {
  const name = input.trim();
  if (
    !name ||
    name === "." ||
    name === ".." ||
    /[\\/]/.test(name) ||
    name.includes("\0")
  )
    throw new Error("Enter a name without slashes.");
  return parent ? `${parent.replace(/\/+$/, "")}/${name}` : name;
}

export function renamedPath(
  path: string,
  input: string,
  {
    directory = false,
    title = false,
  }: { directory?: boolean; title?: boolean } = {},
) {
  const current = fileName(path);
  const extension = directory ? "" : (current.match(/\.[^.]+$/)?.[0] ?? "");
  const requested = input.trim();
  const name =
    extension &&
    (title || !requested.includes(".")) &&
    !requested.toLowerCase().endsWith(extension.toLowerCase())
      ? `${requested}${extension}`
      : requested;
  // Validate before adding an extension so an empty title cannot become .md.
  childPath("", requested);
  return childPath(
    path.slice(0, path.length - current.length).replace(/\/$/, ""),
    name,
  );
}

export function isMarkdownPath(path: string) {
  return /\.(md|markdown)$/i.test(path);
}
