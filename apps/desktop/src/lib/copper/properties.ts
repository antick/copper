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
  properties: Frontmatter,
): Promise<void> {
  return copperInvoke<void>("update_properties", {
    vaultId,
    path,
    properties,
  });
}
