import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useVaultTree } from "@/features/file-tree/queries";
import {
  collectMarkdownNotes,
  mergeIndexedNotes,
  normalizeScope,
  notesInScope,
} from "@/features/search/notes-from-tree";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";

export function useNoteList(
  vaultId: string | undefined,
  scope: string,
  searchQuery: string,
) {
  const activeScope = normalizeScope(scope);
  const activeSearch = searchQuery.trim();
  const searching = activeSearch.length > 0;
  const tree = useVaultTree(vaultId);
  const indexed = useQuery({
    queryKey: searching
      ? [...vaultKeys.notes(vaultId ?? "", "search"), activeSearch]
      : vaultKeys.notes(vaultId ?? "", activeScope),
    queryFn: () =>
      searching
        ? copper.search.query(vaultId ?? "", activeSearch, activeScope)
        : copper.search.notes(vaultId ?? "", activeScope),
    enabled: Boolean(vaultId),
    // A note-list query owns its active scope. Carrying rows from the prior
    // folder, search term, or Vault makes those rows actionable in the wrong
    // context while the new request is pending.
    staleTime: 0,
  });

  // useVaultTree intentionally keeps its previous result while a Vault key is
  // changing. Do not let that placeholder become fallback notes for the new
  // Vault; indexed results for the new key may still be shown independently.
  const activeTree = tree.isPlaceholderData ? undefined : tree.data;
  const fromTree = useMemo(
    () => notesInScope(collectMarkdownNotes(activeTree), activeScope),
    [activeScope, activeTree],
  );

  if (searching) {
    return {
      ...indexed,
      data: notesInScope(indexed.data ?? [], activeScope),
      isPending: Boolean(vaultId && indexed.isPending),
    };
  }

  const data = mergeIndexedNotes(fromTree, indexed.data, activeScope);
  return {
    ...indexed,
    data,
    // If the tree is a cross-Vault placeholder or the active scope has no
    // fallback rows yet, expose a compact loading state instead of rendering
    // cards from the previous query key. Once indexed data arrives, it is
    // valid even while the tree refresh is still in flight.
    isPending: Boolean(
      vaultId &&
        !data.length &&
        (indexed.isPending ||
          tree.isPlaceholderData ||
          (tree.isPending && !activeTree)),
    ),
  };
}
