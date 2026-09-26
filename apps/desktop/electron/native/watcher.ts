import path from "node:path";
import { toPosix } from "./path";

export type FileSystemEvent =
  | { type: "created"; path: string }
  | { type: "modified"; path: string }
  | { type: "removed"; path: string }
  | { type: "renamed"; from: string; to: string };

function relativize(root: string, filePath: string): string | undefined {
  const relative = toPosix(path.relative(root, filePath));
  if (!relative || relative.startsWith("..")) {
    return undefined;
  }
  if (relative.split("/").some((part) => part.startsWith("."))) {
    return undefined;
  }
  return relative;
}

export function normalizeWatchPath(
  root: string,
  filePath: string,
  type: "created" | "modified" | "removed",
): FileSystemEvent | undefined {
  const relative = relativize(root, filePath);
  if (!relative) {
    return undefined;
  }
  return { type, path: relative };
}
