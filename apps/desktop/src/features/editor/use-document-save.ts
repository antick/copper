import { useEffect, useMemo, useRef } from "react";
import {
  type DocumentSaveQueue,
  documentSaveQueue,
} from "@/features/editor/document-save-queue";
import { DOCUMENT_SAVE_DELAY_MS } from "../../../shared/document-save";

export function useDocumentSave(
  save: (contents: string) => Promise<void>,
  delayMs = DOCUMENT_SAVE_DELAY_MS,
  key?: string,
  vaultId?: string,
  identityKey?: string,
) {
  const queueRef = useRef<
    | {
        key?: string;
        vaultId?: string;
        identityKey?: string;
        queue: DocumentSaveQueue;
      }
    | undefined
  >(undefined);
  const identity = queueRef.current;
  let queue: DocumentSaveQueue;
  if (
    identity &&
    identity.key === key &&
    identity.vaultId === vaultId &&
    identity.identityKey === identityKey
  ) {
    queue = identity.queue;
    queue.configure(save, delayMs);
  } else {
    queue = documentSaveQueue(key, save, delayMs, vaultId);
    queue.configure(save, delayMs);
    queueRef.current = { key, vaultId, identityKey, queue };
  }
  useEffect(() => {
    queue.attach();
    return () => queue.detach();
  }, [queue]);
  return useMemo(
    () =>
      Object.assign(queue.schedule, {
        flush: queue.flush,
        hasPending: queue.hasPending,
        cancel: queue.cancel,
        pause: queue.pause,
        resume: queue.resume,
        settle: queue.settle,
      }),
    [queue],
  );
}
