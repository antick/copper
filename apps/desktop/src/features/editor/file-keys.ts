export const fileKeys = {
  detail: (vaultId: string, path: string) => ["file", vaultId, path] as const,
  properties: (vaultId: string, path: string) =>
    ["file", vaultId, path, "properties"] as const,
  backlinks: (vaultId: string, path: string) =>
    ["file", vaultId, path, "backlinks"] as const,
};
