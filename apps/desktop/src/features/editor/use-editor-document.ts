import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  clearDocumentDraft,
  documentDraftKey,
  keepDocumentDraft,
  readDocumentDraft,
} from "@/features/editor/document-drafts";
import { withDocumentWriteLock } from "@/features/editor/document-write-lock";
import { fileKeys } from "@/features/editor/file-keys";
import { useDocumentSave } from "@/features/editor/use-document-save";
import { copper } from "@/lib/copper";
import {
  isRecentCopperSave,
  markCopperSave,
  markDocumentDirty,
  subscribeToVaultFs,
} from "@/lib/copper/events";
import type { DiskRevision } from "@/lib/copper/files";
import {
  DOCUMENT_CONFLICT_CODE,
  DOCUMENT_NOT_FOUND_CODE,
  DOCUMENT_SAVE_DELAY_MS,
  MISSING_DOCUMENT_MESSAGE,
} from "../../../shared/document-save";

export type DocumentSaveStatus = "saved" | "dirty" | "saving" | "error";

function isMissingDocumentError(cause: unknown) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === DOCUMENT_NOT_FOUND_CODE
  );
}

export function useEditorDocument(
  vaultId: string,
  path: string,
  onSaveStatus?: (status: DocumentSaveStatus) => void,
) {
  const client = useQueryClient();
  const key = documentDraftKey(vaultId, path);
  const revision = useRef<DiskRevision | undefined>(undefined);
  const initialized = useRef(false);
  const missingRef = useRef(false);
  const mounted = useRef(true);
  const [dirty, setDirty] = useState(Boolean(readDocumentDraft(key)));
  const [conflict, setConflict] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbacks = useRef({ onSaveStatus });
  callbacks.current = { onSaveStatus };
  const query = useQuery({
    queryKey: fileKeys.detail(vaultId, path),
    queryFn: () => copper.files.read(vaultId, path),
    refetchOnMount: "always",
  });

  const status = useCallback((next: DocumentSaveStatus) => {
    if (mounted.current) callbacks.current.onSaveStatus?.(next);
  }, []);
  const scheduleSave = useDocumentSave(
    async (contents) => {
      const draft = readDocumentDraft(key);
      const expectedHash = draft?.baseHash ?? revision.current?.hash;
      status("saving");
      markCopperSave(vaultId, path);
      try {
        const saved = await copper.files.save(
          vaultId,
          path,
          contents,
          expectedHash,
        );
        if (missingRef.current) {
          const remaining = readDocumentDraft(key);
          markDocumentDirty(vaultId, path, Boolean(remaining));
          if (mounted.current) {
            setDirty(Boolean(remaining));
            setError(MISSING_DOCUMENT_MESSAGE);
          }
          status("error");
          return;
        }
        revision.current = saved;
        clearDocumentDraft(key, contents);
        const remaining = readDocumentDraft(key);
        if (remaining)
          keepDocumentDraft(key, { ...remaining, baseHash: saved.hash });
        client.setQueryData(fileKeys.detail(vaultId, path), [contents, saved]);
        void client.invalidateQueries({
          queryKey: fileKeys.properties(vaultId, path),
        });
        markDocumentDirty(vaultId, path, Boolean(remaining));
        if (mounted.current) {
          setDirty(Boolean(remaining));
          setError(null);
        }
        status(remaining ? "dirty" : "saved");
      } catch (cause) {
        const missingFile = isMissingDocumentError(cause);
        if (missingFile) markMissingDocument();
        if (mounted.current && !missingFile) {
          setError(
            cause instanceof Error
              ? cause.message
              : "The note could not be saved. Your draft is kept for recovery.",
          );
          if ((cause as { code?: string }).code === DOCUMENT_CONFLICT_CODE)
            setConflict(true);
        }
        if ((cause as { code?: string }).code === DOCUMENT_CONFLICT_CODE)
          scheduleSave.pause();
        status("error");
        throw cause;
      }
    },
    DOCUMENT_SAVE_DELAY_MS,
    key,
    vaultId,
  );

  const markMissingDocument = useCallback(() => {
    if (missingRef.current) return;
    missingRef.current = true;
    scheduleSave.cancel();
    const hasDraft = Boolean(readDocumentDraft(key));
    markDocumentDirty(vaultId, path, hasDraft);
    if (mounted.current) {
      setMissing(true);
      setConflict(false);
      setDirty(hasDraft);
      setError(MISSING_DOCUMENT_MESSAGE);
    }
    status("error");
  }, [key, path, scheduleSave, status, vaultId]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (query.isFetching) return;
    if (query.isError && isMissingDocumentError(query.error)) {
      initialized.current = true;
      markMissingDocument();
      return;
    }
    if (query.isError) return;
    if (!query.data) return;
    const draft = readDocumentDraft(key);
    if (!initialized.current) {
      initialized.current = true;
      revision.current = query.data[1];
      if (draft) {
        scheduleSave(draft.contents);
        if (draft.baseHash !== query.data[1].hash) {
          scheduleSave.pause();
          setConflict(true);
        }
      }
      markDocumentDirty(vaultId, path, Boolean(draft));
      status(draft ? "dirty" : "saved");
    } else if (!draft || draft.baseHash === query.data[1].hash) {
      revision.current = query.data[1];
    }
  }, [
    key,
    path,
    query.data,
    query.error,
    query.isError,
    query.isFetching,
    markMissingDocument,
    scheduleSave,
    status,
    vaultId,
  ]);

  useEffect(
    () =>
      subscribeToVaultFs((event) => {
        const matches =
          "path" in event
            ? event.path === path
            : event.from === path || event.to === path;
        if (!matches || missingRef.current) return;
        const removed =
          (event.type === "removed" && event.path === path) ||
          (event.type === "renamed" && event.from === path);
        if (removed) {
          markMissingDocument();
          return;
        }
        if (readDocumentDraft(key) && !isRecentCopperSave(vaultId, path)) {
          scheduleSave.pause();
          setConflict(true);
        }
      }),
    [key, markMissingDocument, path, scheduleSave, vaultId],
  );

  function changed(contents: string) {
    const baseHash = readDocumentDraft(key)?.baseHash ?? revision.current?.hash;
    if (!baseHash) return;
    if (!keepDocumentDraft(key, { contents, baseHash })) {
      setError(
        "Recovery storage is full. Keep this window open until the note saves successfully.",
      );
    }
    setDirty(true);
    markDocumentDirty(vaultId, path, true);
    status("dirty");
    if (!missingRef.current && (initialized.current || !query.isFetching))
      scheduleSave(contents);
  }

  async function reload() {
    await withDocumentWriteLock(vaultId, path, async () => {
      scheduleSave.pause();
      await scheduleSave.settle();
      const payload = await copper.files.read(vaultId, path);
      scheduleSave.cancel();
      clearDocumentDraft(key);
      revision.current = payload[1];
      markDocumentDirty(vaultId, path, false);
      setDirty(false);
      setConflict(false);
      setError(null);
      client.setQueryData(fileKeys.detail(vaultId, path), payload);
      status("saved");
      return payload;
    });
  }

  async function keep() {
    await scheduleSave.settle();
    const [, latest] = await copper.files.read(vaultId, path);
    const draft = readDocumentDraft(key);
    if (!draft) return;
    revision.current = latest;
    keepDocumentDraft(key, { ...draft, baseHash: latest.hash });
    scheduleSave.resume();
    scheduleSave(draft.contents);
    await scheduleSave.flush();
    setConflict(false);
    setError(null);
  }

  function discardRecovery(contents: string) {
    scheduleSave.cancel();
    clearDocumentDraft(key, contents);
    const remaining = readDocumentDraft(key);
    markDocumentDirty(vaultId, path, Boolean(remaining));
    setDirty(Boolean(remaining));
    setError(remaining ? MISSING_DOCUMENT_MESSAGE : null);
    status(remaining ? "dirty" : "error");
  }

  const draft = useCallback(() => readDocumentDraft(key), [key]);
  return {
    query,
    initializing: !initialized.current && query.isFetching,
    initialReadFailed: query.isError && !initialized.current,
    dirty,
    conflict,
    missing,
    error,
    setError,
    changed,
    reload,
    keep,
    discardRecovery,
    scheduleSave,
    draft,
    acceptRevision: (saved: DiskRevision) => {
      revision.current = saved;
    },
  };
}
