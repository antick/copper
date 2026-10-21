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
  DOCUMENT_SAVE_DELAY_MS,
} from "../../../shared/document-save";

export type DocumentSaveStatus = "saved" | "dirty" | "saving" | "error";

export function useEditorDocument(
  vaultId: string,
  path: string,
  onSaveStatus?: (status: DocumentSaveStatus) => void,
) {
  const client = useQueryClient();
  const key = documentDraftKey(vaultId, path);
  const revision = useRef<DiskRevision | undefined>(undefined);
  const initialized = useRef(false);
  const mounted = useRef(true);
  const [dirty, setDirty] = useState(Boolean(readDocumentDraft(key)));
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbacks = useRef({ onSaveStatus });
  callbacks.current = { onSaveStatus };
  const query = useQuery({
    queryKey: fileKeys.detail(vaultId, path),
    queryFn: () => copper.files.read(vaultId, path),
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
        if (mounted.current) {
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
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
  }, [key, path, query.data, scheduleSave, status, vaultId]);

  useEffect(
    () =>
      subscribeToVaultFs((event) => {
        const matches =
          "path" in event
            ? event.path === path
            : event.from === path || event.to === path;
        if (
          matches &&
          readDocumentDraft(key) &&
          !isRecentCopperSave(vaultId, path)
        ) {
          scheduleSave.pause();
          setConflict(true);
        }
      }),
    [key, path, scheduleSave, vaultId],
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
    scheduleSave(contents);
  }

  async function reload() {
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

  const draft = useCallback(() => readDocumentDraft(key), [key]);
  return {
    query,
    dirty,
    conflict,
    error,
    setError,
    changed,
    reload,
    keep,
    scheduleSave,
    draft,
    acceptRevision: (saved: DiskRevision) => {
      revision.current = saved;
    },
  };
}
