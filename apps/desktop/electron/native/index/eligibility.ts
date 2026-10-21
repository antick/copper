import path from "node:path";
import {
  isHiddenTaskContent,
  isTaskSourcePath,
  isTaskStorageDirectory,
} from "../../../shared/task-paths";
import { toPosix } from "../path";

export function isMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

export function shouldIndexEntry(
  relative: string,
  name: string,
  isDirectory: boolean,
): boolean {
  const managed = isDirectory
    ? isTaskStorageDirectory(relative)
    : isTaskSourcePath(relative);
  return !(
    ((isHiddenTaskContent(relative) || name.startsWith(".")) && !managed) ||
    name === "node_modules" ||
    name === "target"
  );
}

export function shouldIndexFile(relative: string): boolean {
  const parts = toPosix(relative).split("/");
  return parts.every((name, index) =>
    shouldIndexEntry(
      parts.slice(0, index + 1).join("/"),
      name,
      index < parts.length - 1,
    ),
  );
}
