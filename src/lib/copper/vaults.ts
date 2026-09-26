import { copperInvoke } from "@/lib/copper/invoke";

export interface VaultInfo {
  id: string;
  name: string;
  path: string;
}

export function list(): Promise<VaultInfo[]> {
  return copperInvoke<VaultInfo[]>("list_recent_vaults");
}

export function openVault(path: string): Promise<VaultInfo> {
  return copperInvoke<VaultInfo>("open_vault", { path });
}

export function close(vaultId: string): Promise<void> {
  return copperInvoke<void>("close_vault", { vaultId });
}

export async function pickAndOpen(): Promise<VaultInfo | null> {
  const selected = await copperInvoke<string | null>("pick_vault_folder");
  if (typeof selected !== "string" || selected.length === 0) {
    return null;
  }
  return openVault(selected);
}
