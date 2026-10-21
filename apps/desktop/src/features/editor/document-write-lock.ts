import type { DiskRevision } from "@/lib/copper/files";
import { DOCUMENT_WRITE_EVENT } from "../../../shared/document-save";

export interface DocumentWriteDetail {
  vaultId: string;
  path: string;
  locked: boolean;
  payload?: [string, DiskRevision];
}
const lockedDocuments = new Set<string>();
const keyFor = (vaultId: string, path: string) =>
  JSON.stringify([vaultId, path]);

export function isDocumentWriteLocked(vaultId: string, path: string) {
  return lockedDocuments.has(keyFor(vaultId, path));
}

export async function withDocumentWriteLock(
  vaultId: string,
  path: string,
  write: () => Promise<[string, DiskRevision]>,
) {
  const key = keyFor(vaultId, path);
  lockedDocuments.add(key);
  const notify = (detail: DocumentWriteDetail) =>
    window.dispatchEvent(new CustomEvent(DOCUMENT_WRITE_EVENT, { detail }));
  notify({ vaultId, path, locked: true });
  let payload: [string, DiskRevision] | undefined;
  try {
    payload = await write();
    return payload;
  } finally {
    lockedDocuments.delete(key);
    notify({ vaultId, path, locked: false, payload });
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
