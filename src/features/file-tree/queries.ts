import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";

export function useVaultTree(vaultId: string | undefined) {
  return useQuery({
    queryKey: vaultId ? vaultKeys.tree(vaultId) : ["vault", "none", "tree"],
    queryFn: () => copper.files.tree(vaultId ?? ""),
    enabled: Boolean(vaultId),
    placeholderData: keepPreviousData,
  });
}
