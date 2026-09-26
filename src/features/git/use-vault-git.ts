import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { registerCommand } from "@/app/commands/registry";
import { queryClient } from "@/app/query-client";
import { fileKeys } from "@/features/editor/file-keys";
import { GIT_STATUS_QUERY_KEY } from "@/features/git/constants";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";
import {
  flushOpenDocuments,
  invalidateVaultNoteQueries,
  markVaultGitOperation,
  subscribeToVaultFs,
} from "@/lib/copper/events";
import type { GitPublishResult, GitStatus } from "@/lib/copper/git";

export const idleGitStatus: GitStatus = { kind: "not_git" };

export function gitStatusKey(vaultId: string) {
  return ["vault", vaultId, GIT_STATUS_QUERY_KEY] as const;
}

export function useVaultGit(vaultId: string | undefined) {
  const statusQuery = useQuery({
    queryKey: gitStatusKey(vaultId ?? ""),
    enabled: Boolean(vaultId),
    queryFn: () => copper.git.status(vaultId ?? ""),
  });

  useEffect(() => {
    if (!vaultId) {
      return;
    }
    return subscribeToVaultFs(() => {
      void queryClient.invalidateQueries({ queryKey: gitStatusKey(vaultId) });
    });
  }, [vaultId]);

  const publish = useMutation({
    mutationFn: async (): Promise<GitPublishResult> => {
      if (!vaultId) {
        return {
          kind: "error",
          reason: "not_git",
          changedPaths: [],
          siblingPaths: [],
        };
      }
      await flushOpenDocuments();
      return copper.git.publish(vaultId);
    },
    onSuccess: async (result) => {
      if (!vaultId) {
        return;
      }
      markVaultGitOperation(vaultId);
      const paths = [...result.changedPaths, ...result.siblingPaths];
      await Promise.all(
        paths.map((path) =>
          Promise.resolve(copper.search.indexFile(vaultId, path)).catch(
            () => undefined,
          ),
        ),
      );
      for (const path of paths) {
        void queryClient.invalidateQueries({
          queryKey: fileKeys.detail(vaultId, path),
        });
        void queryClient.invalidateQueries({
          queryKey: fileKeys.properties(vaultId, path),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["file", vaultId],
      });
      await invalidateVaultNoteQueries(vaultId);
      await queryClient.invalidateQueries({ queryKey: gitStatusKey(vaultId) });
      void queryClient.invalidateQueries({ queryKey: vaultKeys.tree(vaultId) });
    },
  });

  useEffect(() => {
    if (!vaultId) {
      return;
    }
    return registerCommand("publish-vault-git", () => {
      if (publish.isPending) {
        return;
      }
      void publish.mutateAsync();
    });
  }, [publish, vaultId]);

  return {
    status: statusQuery.data ?? idleGitStatus,
    running: publish.isPending,
    publish: publish.mutateAsync,
    result: publish.data ?? null,
    resetResult: publish.reset,
  };
}
