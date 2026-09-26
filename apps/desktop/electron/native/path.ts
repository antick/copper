import fs from "node:fs";
import path from "node:path";
import { CopperError } from "./errors";

function isWindowsDriveAbsolute(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

export function toPosix(value: string): string {
  return value.replaceAll("\\", "/");
}

export function normalizeRelative(input: string): string {
  const posix = toPosix(input);
  if (path.posix.isAbsolute(posix) || isWindowsDriveAbsolute(input)) {
    throw CopperError.pathEscape("Absolute paths are not allowed");
  }
  const parts: string[] = [];
  for (const part of posix.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (parts.length === 0) {
        throw CopperError.pathEscape("Path is outside the active Vault");
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

export function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function canonicalizeDir(dir: string): string {
  try {
    const canonical = fs.realpathSync(dir);
    if (!fs.statSync(canonical).isDirectory()) {
      throw CopperError.invalid("Vault path must be a directory");
    }
    return canonical;
  } catch (error) {
    if (error instanceof CopperError) {
      throw error;
    }
    throw CopperError.notFound(
      `Could not open Vault: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function resolveInVault(root: string, requested: string): string {
  const canonicalRoot = fs.realpathSync(root);
  if (!requested || requested === ".") {
    return canonicalRoot;
  }
  if (isWindowsDriveAbsolute(requested) && !path.isAbsolute(requested))
    throw CopperError.pathEscape("Path is outside the active Vault");
  const joined = path.isAbsolute(requested)
    ? path.normalize(requested)
    : path.join(canonicalRoot, requested);
  if (entryExists(joined)) {
    const candidate = fs.realpathSync(joined);
    if (!isInsideRoot(canonicalRoot, candidate)) {
      throw CopperError.pathEscape("Path is outside the active Vault");
    }
    return candidate;
  }

  let ancestor = joined;
  while (!entryExists(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) {
      throw CopperError.pathEscape("Path is outside the active Vault");
    }
    ancestor = parent;
  }
  const ancestorCanon = fs.realpathSync(ancestor);
  if (!isInsideRoot(canonicalRoot, ancestorCanon)) {
    throw CopperError.pathEscape("Path is outside the active Vault");
  }
  const suffix = path.relative(ancestor, joined);
  const candidate = path.join(ancestorCanon, suffix);
  if (!isInsideRoot(canonicalRoot, candidate)) {
    throw CopperError.pathEscape("Path is outside the active Vault");
  }
  return candidate;
}

function entryExists(candidate: string): boolean {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
