import fs from "node:fs";
import path from "node:path";
import { resolveInVault, toPosix } from "../path";
import {
  GIT_SIDECAR_SUFFIX_GITHUB,
  GIT_SIDECAR_SUFFIX_REMOTE,
} from "./constants";
import type { GitHostKind } from "./types";

export function sidecarSuffix(host: GitHostKind): string {
  return host === "github"
    ? GIT_SIDECAR_SUFFIX_GITHUB
    : GIT_SIDECAR_SUFFIX_REMOTE;
}

export function splitBaseName(filename: string): { stem: string; ext: string } {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    return { stem: filename, ext: "" };
  }
  return {
    stem: filename.slice(0, lastDot),
    ext: filename.slice(lastDot),
  };
}

export function nextSiblingRelative(
  root: string,
  relativeFile: string,
  suffix: string,
): string {
  const posix = toPosix(relativeFile);
  const slash = posix.lastIndexOf("/");
  const dir = slash === -1 ? "" : posix.slice(0, slash);
  const base = slash === -1 ? posix : posix.slice(slash + 1);
  const { stem, ext } = splitBaseName(base);
  for (let n = 0; n < 10_000; n += 1) {
    const label = n === 0 ? `(${suffix})` : `(${suffix}) ${n + 1}`;
    const name = `${stem} ${label}${ext}`;
    const relative = dir ? `${dir}/${name}` : name;
    const absolute = resolveInVault(root, relative);
    if (!fs.existsSync(absolute)) {
      return relative;
    }
  }
  throw new Error(`Could not allocate a sibling name for ${relativeFile}`);
}

export function siblingDirectory(relativeFile: string): string {
  const posix = toPosix(relativeFile);
  const slash = posix.lastIndexOf("/");
  return slash === -1 ? "" : posix.slice(0, slash);
}

export function absoluteInVault(root: string, relativeFile: string): string {
  return resolveInVault(root, toPosix(relativeFile));
}

export function dirnameAbsolute(root: string, relativeFile: string): string {
  const relativeDir = siblingDirectory(relativeFile);
  if (!relativeDir) {
    return root;
  }
  return path.join(root, ...relativeDir.split("/"));
}
