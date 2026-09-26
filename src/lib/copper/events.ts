import { queryClient } from "@/app/query-client";
import { fileKeys } from "@/features/editor/file-keys";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";

const dirtyDocuments = new Set<string>();
const recentCopperSaves = new Map<string, number>();
const recentGitOps = new Map<string, number>();
const documentKey = (vaultId: string, path: string) => `${vaultId}:${path}`;
const RECENT_SAVE_MS = 2_000;
const RECENT_GIT_MS = 2_000;

export function markDocumentDirty(
  vaultId: string,
  path: string,
  dirty: boolean,
) {
  const key = documentKey(vaultId, path);
  if (dirty) dirtyDocuments.add(key);
  else dirtyDocuments.delete(key);
}

export function hasDirtyDocuments() {
  return dirtyDocuments.size > 0;
}

export function markCopperSave(vaultId: string, path: string) {
  recentCopperSaves.set(documentKey(vaultId, path), Date.now());
}

export function isRecentCopperSave(vaultId: string, path: string) {
  const savedAt = recentCopperSaves.get(documentKey(vaultId, path));
  return savedAt !== undefined && Date.now() - savedAt < RECENT_SAVE_MS;
}

export function markVaultGitOperation(vaultId: string) {
  recentGitOps.set(vaultId, Date.now());
}

export function isRecentVaultGitOperation(vaultId: string) {
  const at = recentGitOps.get(vaultId);
  return at !== undefined && Date.now() - at < RECENT_GIT_MS;
}

export type FlushDocumentsDetail = {
  enqueue: (promise: Promise<void>) => void;
};

export function flushOpenDocuments(): Promise<void> {
  const pending: Promise<void>[] = [];
  window.dispatchEvent(
    new CustomEvent<FlushDocumentsDetail>("copper:flush-documents", {
      detail: {
        enqueue(promise) {
          pending.push(promise);
        },
      },
    }),
  );
  return Promise.all(pending).then(() => undefined);
}

export type FileSystemEvent =
  | { type: "created"; path: string }
  | { type: "modified"; path: string }
  | { type: "removed"; path: string }
  | { type: "renamed"; from: string; to: string };

/**
 * Invalidate every contextual note query for a Vault, not only the currently
 * selected folder. Mutations can affect an all-notes result and any number of
 * cached folder/search views at the same time.
 */
export async function invalidateVaultNoteQueries(vaultId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: vaultKeys.tree(vaultId) }),
    queryClient.invalidateQueries({
      queryKey: ["vault", vaultId, "notes"],
    }),
  ]);
}

/**
 * Apply one filesystem event and invalidate after the index operation settles.
 * Invalidating only before indexing lets a refetch win the race and cache the
 * pre-mutation index until the next unrelated event.
 */
export async function handleVaultFileSystemEvent(
  vaultId: string,
  payload: FileSystemEvent,
) {
  if (payload.type === "created" || payload.type === "modified") {
    await Promise.resolve(copper.search.indexFile(vaultId, payload.path)).catch(
      () => undefined,
    );
    const key = documentKey(vaultId, payload.path);
    const shouldReload =
      !dirtyDocuments.has(key) &&
      !isRecentCopperSave(vaultId, payload.path) &&
      !isRecentVaultGitOperation(vaultId);
    if (shouldReload) {
      void queryClient.invalidateQueries({
        queryKey: fileKeys.detail(vaultId, payload.path),
      });
      void queryClient.invalidateQueries({
        queryKey: fileKeys.properties(vaultId, payload.path),
      });
    }
  } else if (payload.type === "removed") {
    await Promise.resolve(
      copper.search.removeIndexed(vaultId, payload.path),
    ).catch(() => undefined);
    queryClient.removeQueries({
      queryKey: fileKeys.detail(vaultId, payload.path),
    });
  } else if (payload.type === "renamed") {
    await Promise.resolve(
      copper.search.removeIndexed(vaultId, payload.from),
    ).catch(() => undefined);
    await Promise.resolve(copper.search.indexFile(vaultId, payload.to)).catch(
      () => undefined,
    );
  }

  await invalidateVaultNoteQueries(vaultId);
}

export function subscribeToVaultFs(
  handler: (payload: FileSystemEvent) => void,
): () => void {
  return (
    window.copperDesktop?.on("vault://fs", (payload) => {
      handler(payload as FileSystemEvent);
    }) ?? (() => undefined)
  );
}

export async function listenToVaultEvents(vaultId: string) {
  return subscribeToVaultFs((payload) => {
    void handleVaultFileSystemEvent(vaultId, payload);
  });
}
