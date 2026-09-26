import fs from "node:fs";
import path from "node:path";
import { ARCHIVE_DIR, SKIP_DIR_NAMES } from "../constants";
import { classifyFile, type FileKind } from "./classification";

export interface FileTreeNode {
  name: string;
  path: string;
  kind: string;
  fileKind?: FileKind;
  typeLabel?: string;
  children?: FileTreeNode[];
}

function shouldSkip(name: string): boolean {
  return name.startsWith(".") || SKIP_DIR_NAMES.has(name);
}

export function scanTree(root: string): FileTreeNode {
  const name = path.basename(root) || "Vault";
  return {
    name,
    path: "",
    kind: "directory",
    children: scanChildren(root, ""),
  };
}

function scanChildren(dir: string, relative: string): FileTreeNode[] {
  const folders: FileTreeNode[] = [];
  const files: FileTreeNode[] = [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  for (const entry of entries) {
    const name = entry.name;
    if (shouldSkip(name) || (relative === "" && name === ARCHIVE_DIR)) {
      continue;
    }
    const childRel = relative ? `${relative}/${name}` : name;
    const absolute = path.join(dir, name);
    if (entry.isDirectory()) {
      folders.push({
        name,
        path: childRel,
        kind: "directory",
        children: scanChildren(absolute, childRel),
      });
    } else if (entry.isFile()) {
      const classification = classifyFile(absolute);
      if (classification) {
        files.push({
          name,
          path: childRel,
          kind: "file",
          fileKind: classification.kind,
          typeLabel: classification.typeLabel,
        });
      }
    }
  }
  return [...folders, ...files];
}
