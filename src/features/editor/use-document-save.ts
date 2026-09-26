import { useCallback, useEffect, useMemo, useRef } from "react";

export type ScheduledDocumentSave = ((contents: string) => void) & {
  flush: () => Promise<void>;
  hasPending: () => boolean;
  cancel: () => void;
};

/**
 * Debounces normal persistence while guaranteeing that a pending edit is
 * flushed when the editor unmounts (for example, during a quick tab switch).
 */
export function useDocumentSave(
  save: (contents: string) => Promise<void>,
  delayMs = 400,
): ScheduledDocumentSave {
  const saveRef = useRef(save);
  saveRef.current = save;
  const timerRef = useRef<number>(undefined);
  const pendingRef = useRef<string | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    const contents = pendingRef.current;
    if (contents === undefined) return;
    pendingRef.current = undefined;
    try {
      await saveRef.current(contents);
    } catch (error) {
      pendingRef.current ??= contents;
      throw error;
    }
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      const contents = pendingRef.current;
      pendingRef.current = undefined;
      if (contents !== undefined) {
        // React cleanup cannot await, but starting the save here prevents a
        // tab switch from simply discarding the debounced buffer.
        void saveRef.current(contents).catch(() => undefined);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    pendingRef.current = undefined;
  }, []);

  const schedule = useCallback(
    (contents: string) => {
      pendingRef.current = contents;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flush().catch(() => undefined);
      }, delayMs);
    },
    [delayMs, flush],
  );

  return useMemo(
    () =>
      Object.assign(schedule, {
        flush,
        hasPending: () => pendingRef.current !== undefined,
        cancel,
      }),
    [cancel, flush, schedule],
  );
}
