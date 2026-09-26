import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupportedFileKind } from "@/features/file-tree/types";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";

export interface FileMutationTarget {
  path: string;
  kind: string;
  fileKind?: SupportedFileKind;
}

export function useFileMutations(vaultId: string | undefined) {
  const queryClient = useQueryClient();

  function invalidateTree() {
    if (vaultId) {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.tree(vaultId) });
      void queryClient.invalidateQueries({
        queryKey: ["vault", vaultId, "notes"],
      });
    }
  }

  async function updateIndexForMove(
    from: string,
    to: string,
    markdown: boolean,
  ) {
    if (!vaultId) return;
    if (markdown) {
      await copper.search.removeIndexed(vaultId, from);
      await copper.search.indexFile(vaultId, to);
    } else {
      await copper.search.removeIndexed(vaultId, from);
    }
  }

  const createFile = useMutation({
    mutationFn: (path: string) =>
      copper.files.createFile(vaultId ?? "", path, ""),
    onSuccess: async (_result, path) => {
      if (vaultId) await copper.search.indexFile(vaultId, path);
      invalidateTree();
    },
  });
  const createFolder = useMutation({
    mutationFn: (path: string) =>
      copper.files.createFolder(vaultId ?? "", path),
    onSuccess: invalidateTree,
  });
  const rename = useMutation({
    mutationFn: ({
      from,
      to,
    }: { from: string; to: string } & Omit<FileMutationTarget, "path">) =>
      copper.files.rename(vaultId ?? "", from, to),
    onSuccess: async (_result, { from, to, kind, fileKind }) => {
      if (kind === "file") {
        await updateIndexForMove(from, to, fileKind === "markdown");
      } else if (vaultId) {
        await copper.search.indexVault(vaultId);
      }
      invalidateTree();
    },
  });
  const trash = useMutation({
    mutationFn: ({ path }: FileMutationTarget) =>
      copper.files.trash(vaultId ?? "", path),
    onSuccess: async (_result, { path, kind }) => {
      if (vaultId && kind === "file") {
        await copper.search.removeIndexed(vaultId, path);
      } else if (vaultId) {
        await copper.search.indexVault(vaultId);
      }
      invalidateTree();
    },
  });
  const archive = useMutation({
    mutationFn: (path: string) => copper.files.archive(vaultId ?? "", path),
    onSuccess: async (to, from) => {
      await updateIndexForMove(from, to, true);
      invalidateTree();
    },
  });
  const restore = useMutation({
    mutationFn: (path: string) => copper.files.restore(vaultId ?? "", path),
    onSuccess: async (to, from) => {
      await updateIndexForMove(from, to, true);
      invalidateTree();
    },
  });

  return { createFile, createFolder, rename, trash, archive, restore };
}
