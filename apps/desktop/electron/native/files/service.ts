import fs from "node:fs";
import path from "node:path";
import { atomicWrite } from "../atomic-write";
import { ARCHIVE_DIR, MAX_SUPPORTED_FILE_SIZE } from "../constants";
import { CopperError } from "../errors";
import { normalizeRelative, resolveInVault, toPosix } from "../path";
import {
  classifyFile,
  type FileClassification,
  isTextKind,
  validateImageSignature,
  validateTextBytes,
} from "./classification";
import { type DiskRevision, revisionFromPath } from "./revision";

export interface BinaryFileMetadata {
  mimeType: string;
  size: number;
}

function isArchiveRoot(relative: string): boolean {
  return relative === ARCHIVE_DIR;
}

function isArchived(relative: string): boolean {
  return relative === ARCHIVE_DIR || relative.startsWith(`${ARCHIVE_DIR}/`);
}

function rejectReservedArchiveCreation(relative: string): void {
  if (isArchived(relative)) {
    throw CopperError.invalid("Archive is a reserved Vault directory");
  }
}

function supportedExistingFile(
  root: string,
  relativeInput: string,
): { relative: string; absolute: string; classification: FileClassification } {
  const relative = normalizeRelative(relativeInput);
  if (!relative) {
    throw CopperError.invalid("A file path is required");
  }
  const absolute = resolveInVault(root, relative);
  if (!fs.existsSync(absolute)) {
    throw CopperError.notFound("Vault file does not exist");
  }
  const metadata = fs.statSync(absolute);
  if (!metadata.isFile()) {
    throw CopperError.invalid("Requested path is not a regular file");
  }
  if (metadata.size > MAX_SUPPORTED_FILE_SIZE) {
    throw CopperError.invalid("File exceeds the 25 MiB supported-file limit");
  }
  const classification = classifyFile(absolute);
  if (!classification) {
    throw CopperError.invalid("Unsupported or unsafe file type");
  }
  return { relative, absolute, classification };
}

function moveWithoutOverwrite(
  root: string,
  source: string,
  destinationRel: string,
): string {
  const destination = resolveInVault(root, toPosix(destinationRel));
  if (fs.existsSync(destination)) {
    throw CopperError.invalid("Archive destination already exists");
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
  return toPosix(destinationRel);
}

export function createFile(
  root: string,
  relativeInput: string,
  contents: string,
): string {
  const relative = normalizeRelative(relativeInput);
  rejectReservedArchiveCreation(relative);
  const absolute = resolveInVault(root, relative);
  if (fs.existsSync(absolute)) {
    throw CopperError.invalid("File already exists");
  }
  if (Buffer.byteLength(contents, "utf8") > MAX_SUPPORTED_FILE_SIZE) {
    throw CopperError.invalid("File exceeds the 25 MiB supported-file limit");
  }
  atomicWrite(absolute, contents);
  return toPosix(relative);
}

export function createFolder(root: string, relativeInput: string): string {
  const relative = normalizeRelative(relativeInput);
  rejectReservedArchiveCreation(relative);
  const absolute = resolveInVault(root, relative);
  fs.mkdirSync(absolute, { recursive: true });
  return toPosix(relative);
}

export function readFile(
  root: string,
  relativeInput: string,
): [string, DiskRevision] {
  const { relative, absolute, classification } = supportedExistingFile(
    root,
    relativeInput,
  );
  if (!isTextKind(classification.kind)) {
    throw CopperError.invalid("Images must be opened with the image viewer");
  }
  const contents = validateTextBytes(fs.readFileSync(absolute));
  const posix = toPosix(relative);
  return [contents, revisionFromPath(absolute, posix)];
}

export function binaryMetadata(
  root: string,
  relativeInput: string,
): BinaryFileMetadata {
  const { absolute, classification } = supportedExistingFile(
    root,
    relativeInput,
  );
  const bytes = fs.readFileSync(absolute);
  validateImageSignature(classification, bytes);
  if (!classification.mimeType) {
    throw CopperError.invalid("Requested file is not a supported image");
  }
  return { mimeType: classification.mimeType, size: bytes.length };
}

export function readBinaryFile(root: string, relativeInput: string): Buffer {
  const { absolute, classification } = supportedExistingFile(
    root,
    relativeInput,
  );
  if (classification.kind !== "image") {
    throw CopperError.invalid("Requested file is not a supported image");
  }
  const bytes = fs.readFileSync(absolute);
  validateImageSignature(classification, bytes);
  return bytes;
}

export function saveFile(
  root: string,
  relativeInput: string,
  contents: string,
): DiskRevision {
  const { relative, absolute, classification } = supportedExistingFile(
    root,
    relativeInput,
  );
  if (!isTextKind(classification.kind)) {
    throw CopperError.invalid("Images are read-only");
  }
  if (Buffer.byteLength(contents, "utf8") > MAX_SUPPORTED_FILE_SIZE) {
    throw CopperError.invalid("File exceeds the 25 MiB supported-file limit");
  }
  atomicWrite(absolute, contents);
  return revisionFromPath(absolute, toPosix(relative));
}

export function renamePath(root: string, from: string, to: string): string {
  const fromRel = normalizeRelative(from);
  const toRel = normalizeRelative(to);
  if (isArchiveRoot(fromRel) || isArchiveRoot(toRel)) {
    throw CopperError.invalid("Archive is a reserved Vault directory");
  }
  if (isArchived(fromRel) !== isArchived(toRel)) {
    throw CopperError.invalid(
      "Use Archive or Restore to move notes across the Archive boundary",
    );
  }
  const fromAbs = resolveInVault(root, fromRel);
  if (!fs.existsSync(fromAbs)) {
    throw CopperError.notFound("Vault item does not exist");
  }
  const toAbs = resolveInVault(root, toRel);
  if (fs.existsSync(toAbs)) {
    throw CopperError.invalid("Destination already exists");
  }
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromAbs, toAbs);
  return toPosix(toRel);
}

export function archiveFile(root: string, relativeInput: string): string {
  const { relative, absolute, classification } = supportedExistingFile(
    root,
    relativeInput,
  );
  if (classification.kind !== "markdown") {
    throw CopperError.invalid("Only Markdown notes can be archived");
  }
  if (isArchived(relative)) {
    throw CopperError.invalid("Note is already archived");
  }
  return moveWithoutOverwrite(root, absolute, `${ARCHIVE_DIR}/${relative}`);
}

export function restoreFile(root: string, relativeInput: string): string {
  const { relative, absolute, classification } = supportedExistingFile(
    root,
    relativeInput,
  );
  if (classification.kind !== "markdown") {
    throw CopperError.invalid("Only Markdown notes can be restored");
  }
  if (!isArchived(relative)) {
    throw CopperError.invalid("Note is not in Archive");
  }
  const destination = relative.slice(ARCHIVE_DIR.length).replace(/^\/+/, "");
  if (!destination) {
    throw CopperError.invalid("Invalid Archive path");
  }
  return moveWithoutOverwrite(root, absolute, destination);
}

export async function trashPath(
  root: string,
  relativeInput: string,
  trashBackend: (absolute: string) => Promise<void>,
): Promise<void> {
  const relative = normalizeRelative(relativeInput);
  if (!relative || isArchiveRoot(relative)) {
    throw CopperError.invalid(
      "The Vault root and reserved Archive cannot be trashed",
    );
  }
  const absolute = resolveInVault(root, relative);
  if (!fs.existsSync(absolute)) {
    throw CopperError.notFound("Vault item does not exist");
  }
  await trashBackend(absolute);
}
