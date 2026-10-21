import { useEffect, useMemo, useRef } from "react";
import { documentSaveQueue } from "@/features/editor/document-save-queue";
import { DOCUMENT_SAVE_DELAY_MS } from "../../../shared/document-save";

export function useDocumentSave(
  save: (contents: string) => Promise<void>,
  delayMs = DOCUMENT_SAVE_DELAY_MS,
  key?: string,
) {
  const current = useRef({ save, delayMs });
  current.current = { save, delayMs };
  const queue = useMemo(
    () =>
      documentSaveQueue(
        key,
        (contents) => current.current.save(contents),
        current.current.delayMs,
      ),
    [key],
  );
  queue.configure((contents) => current.current.save(contents), delayMs);
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
