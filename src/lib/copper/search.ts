import { copperInvoke } from "@/lib/copper/invoke";

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
  tags: string[];
  mtimeNs: number;
}

export function query(
  vaultId: string,
  text: string,
  folder = "all",
): Promise<SearchHit[]> {
  return copperInvoke<SearchHit[]>("search_vault", {
    vaultId,
    query: text,
    folder,
  });
}

export function notes(vaultId: string, folder: string): Promise<SearchHit[]> {
  return copperInvoke<SearchHit[]>("list_notes", { vaultId, folder });
}

export function rebuild(vaultId: string): Promise<number> {
  return copperInvoke<number>("rebuild_vault_index", { vaultId });
}

export function indexVault(vaultId: string): Promise<number> {
  return copperInvoke<number>("index_open_vault", { vaultId });
}

export function indexFile(vaultId: string, path: string): Promise<void> {
  return copperInvoke<void>("index_file_path", { vaultId, path });
}

export function removeIndexed(vaultId: string, path: string): Promise<void> {
  return copperInvoke<void>("remove_indexed_file", { vaultId, path });
}
