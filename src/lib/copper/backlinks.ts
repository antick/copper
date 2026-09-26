import { copperInvoke } from "@/lib/copper/invoke";

export interface Backlink {
  sourcePath: string;
  targetRaw: string;
}

export function list(vaultId: string, path: string): Promise<Backlink[]> {
  return copperInvoke<Backlink[]>("list_backlinks", {
    vaultId,
    path,
  });
}
