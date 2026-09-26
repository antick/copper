export const vaultKeys = {
  all: ["vaults"] as const,
  detail: (vaultId: string) => ["vault", vaultId] as const,
  tree: (vaultId: string) => ["vault", vaultId, "tree"] as const,
  notes: (vaultId: string, scope: string) =>
    ["vault", vaultId, "notes", scope] as const,
};
