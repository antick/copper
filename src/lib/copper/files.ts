import type { FileTreeNode } from "@/features/file-tree/types";
import { copperInvoke } from "@/lib/copper/invoke";

export interface DiskRevision {
  path: string;
  size: number;
  mtimeNs: number;
  hash: string;
}

export function tree(vaultId: string): Promise<FileTreeNode> {
  return copperInvoke<FileTreeNode>("vault_tree", { vaultId });
}

export function read(
  vaultId: string,
  path: string,
): Promise<[string, DiskRevision]> {
  return copperInvoke<[string, DiskRevision]>("read_file", {
    vaultId,
    path,
  });
}

export interface BinaryFileMetadata {
  mimeType: string;
  size: number;
}

export function binaryMetadata(
  vaultId: string,
  path: string,
): Promise<BinaryFileMetadata> {
  return copperInvoke<BinaryFileMetadata>("binary_file_metadata", {
    vaultId,
    path,
  });
}

export async function readBinary(
  vaultId: string,
  path: string,
): Promise<Uint8Array> {
  const response = await copperInvoke<ArrayBuffer | Uint8Array | number[]>(
    "read_binary_file",
    { vaultId, path },
  );
  if (response instanceof Uint8Array) return response;
  if (response instanceof ArrayBuffer) return new Uint8Array(response);
  return new Uint8Array(response);
}

export function save(
  vaultId: string,
  path: string,
  contents: string,
): Promise<DiskRevision> {
  return copperInvoke<DiskRevision>("save_file", {
    vaultId,
    path,
    contents,
  });
}

export function createFile(
  vaultId: string,
  path: string,
  contents = "",
): Promise<string> {
  return copperInvoke<string>("create_file", {
    vaultId,
    path,
    contents,
  });
}

export function createFolder(vaultId: string, path: string): Promise<string> {
  return copperInvoke<string>("create_folder", { vaultId, path });
}

export function rename(
  vaultId: string,
  from: string,
  to: string,
): Promise<string> {
  return copperInvoke<string>("rename_path", { vaultId, from, to });
}

export function archive(vaultId: string, path: string): Promise<string> {
  return copperInvoke<string>("archive_file", { vaultId, path });
}

export function restore(vaultId: string, path: string): Promise<string> {
  return copperInvoke<string>("restore_file", { vaultId, path });
}

export function trash(vaultId: string, path: string): Promise<void> {
  return copperInvoke<void>("trash_path", { vaultId, path });
}

export function importAttachment(
  vaultId: string,
  sourcePath: string,
  attachmentFolder: string,
): Promise<string> {
  return copperInvoke<string>("import_attachment", {
    vaultId,
    sourcePath,
    attachmentFolder,
  });
}
