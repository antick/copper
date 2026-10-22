import type { DiskRevision } from "@/lib/copper/files";
import { DOCUMENT_WRITE_EVENT } from "../../../shared/document-save";

export interface DocumentWriteDetail {
  vaultId: string;
  path: string;
  locked: boolean;
  payload?: [string, DiskRevision];
}
const lockedDocuments = new Map<string, number>();
const keyFor = (vaultId: string, path: string) =>
  JSON.stringify([vaultId, path]);

export function isDocumentWriteLocked(vaultId: string, path: string) {
  return (lockedDocuments.get(keyFor(vaultId, path)) ?? 0) > 0;
}

export async function withDocumentWriteLock(
  vaultId: string,
  path: string,
  write: () => Promise<[string, DiskRevision]>,
) {
  const key = keyFor(vaultId, path);
  lockedDocuments.set(key, (lockedDocuments.get(key) ?? 0) + 1);
  const notify = (detail: DocumentWriteDetail) =>
    window.dispatchEvent(new CustomEvent(DOCUMENT_WRITE_EVENT, { detail }));
  notify({ vaultId, path, locked: true });
  let payload: [string, DiskRevision] | undefined;
  try {
    payload = await write();
    return payload;
  } finally {
    const remaining = Math.max(0, (lockedDocuments.get(key) ?? 1) - 1);
    if (remaining > 0) lockedDocuments.set(key, remaining);
    else lockedDocuments.delete(key);
    notify({ vaultId, path, locked: remaining > 0, payload });
  }
}

export function waitForDocumentWrite(
  vaultId: string,
  path: string,
): Promise<void> {
  if (!isDocumentWriteLocked(vaultId, path)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = (event: Event) => {
      const detail = (event as CustomEvent<DocumentWriteDetail>).detail;
      if (detail.vaultId !== vaultId || detail.path !== path || detail.locked)
        return;
      window.removeEventListener(DOCUMENT_WRITE_EVENT, done);
      resolve();
    };
    window.addEventListener(DOCUMENT_WRITE_EVENT, done);
  });
}
