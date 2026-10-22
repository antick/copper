import { useEffect, useReducer } from "react";
import { documentDraftTargets } from "@/features/editor/document-drafts";
import { DOCUMENT_SAVE_STATE_EVENT } from "../../../shared/document-save";

export function DocumentRecoveryBanner({
  vaultId,
  activePath,
  onOpen,
}: {
  vaultId?: string;
  activePath?: string | null;
  onOpen: (path: string) => void;
}) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    window.addEventListener(DOCUMENT_SAVE_STATE_EVENT, refresh);
    return () => window.removeEventListener(DOCUMENT_SAVE_STATE_EVENT, refresh);
  }, []);
  const recovery = documentDraftTargets().find(
    (draft) => draft.vaultId === vaultId && draft.path !== activePath,
  );
  if (!recovery) return null;
  return (
    <div className="copper-conflict-banner" role="status">
      Unsaved changes are kept for {recovery.path}.
      <button type="button" onClick={() => onOpen(recovery.path)}>
        Recover draft
      </button>
    </div>
  );
}
