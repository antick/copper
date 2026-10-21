import type { DiskRevision } from "@/lib/copper/files";
import { copperInvoke } from "@/lib/copper/invoke";

export interface Frontmatter {
  raw: string;
  body: string;
  values: Record<string, unknown>;
}

export function read(vaultId: string, path: string): Promise<Frontmatter> {
  return copperInvoke<Frontmatter>("read_properties", {
    vaultId,
    path,
  });
}

export function update(
  vaultId: string,
  path: string,
  values: Record<string, unknown>,
): Promise<[string, DiskRevision]> {
  return copperInvoke<[string, DiskRevision]>("update_properties", {
    vaultId,
    path,
    values,
  });
}
