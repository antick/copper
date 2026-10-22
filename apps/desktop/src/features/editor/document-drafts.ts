import {
  DOCUMENT_DRAFT_PREFIX,
  DOCUMENT_SAVE_STATE_EVENT,
} from "../../../shared/document-save";

export interface DocumentDraft {
  contents: string;
  baseHash: string;
}
const drafts = new Map<string, DocumentDraft>();
// Renderer-lifetime tombstones hide persisted drafts after a failed removal.
const clearedStorageDrafts = new Set<string>();
export const documentDraftKey = (vaultId: string, path: string) =>
  `${DOCUMENT_DRAFT_PREFIX}${JSON.stringify([vaultId, path])}`;

export function readDocumentDraft(key: string): DocumentDraft | undefined {
  if (drafts.has(key)) return drafts.get(key);
  if (clearedStorageDrafts.has(key)) return undefined;
  try {
    const raw = localStorage.getItem(key);
    const draft = raw ? JSON.parse(raw) : undefined;
    if (
      typeof draft?.contents === "string" &&
      typeof draft.baseHash === "string"
    ) {
      drafts.set(key, draft);
      return draft;
    }
  } catch {
    /* A damaged recovery entry must not stop opening the note. */
  }
  return undefined;
}

export function keepDocumentDraft(key: string, draft: DocumentDraft) {
  const added = !readDocumentDraft(key);
  drafts.set(key, draft);
  if (added) window.dispatchEvent(new Event(DOCUMENT_SAVE_STATE_EVENT));
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    clearedStorageDrafts.delete(key);
    return true;
  } catch {
    return false;
  }
}

export function clearDocumentDraft(key: string, savedContents?: string) {
  if (
    savedContents !== undefined &&
    readDocumentDraft(key)?.contents !== savedContents
  )
    return;
  drafts.delete(key);
  try {
    localStorage.removeItem(key);
    clearedStorageDrafts.delete(key);
  } catch {
    clearedStorageDrafts.add(key);
    try {
      localStorage.setItem(key, JSON.stringify(null));
    } catch {
      // The session marker still hides stale bytes when all storage is blocked.
    }
  }
  window.dispatchEvent(new Event(DOCUMENT_SAVE_STATE_EVENT));
}

export function hasDocumentDrafts(vaultId?: string) {
  return documentDraftTargets(vaultId).length > 0;
}

export function documentDraftTargets(requestedVaultId?: string) {
  const keys = new Set(drafts.keys());
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(DOCUMENT_DRAFT_PREFIX)) keys.add(key);
    }
  } catch {
    /* In-memory drafts remain available when storage is disabled. */
  }
  return [...keys].flatMap((key) => {
    try {
      const [vaultId, path] = JSON.parse(
        key.slice(DOCUMENT_DRAFT_PREFIX.length),
      );
      return typeof vaultId === "string" &&
        typeof path === "string" &&
        (requestedVaultId === undefined || vaultId === requestedVaultId) &&
        readDocumentDraft(key)
        ? [{ vaultId, path, key }]
        : [];
    } catch {
      return [];
    }
  });
}
