import {
  clearDocumentDraft,
  documentDraftKey,
} from "@/features/editor/document-drafts";
import "./unavailable-document-draft.css";

export function UnavailableDocumentDraft({
  vaultId,
  path,
  contents,
  onDiscard,
}: {
  vaultId: string;
  path: string;
  contents: string;
  onDiscard: () => void;
}) {
  return (
    <section
      className="copper-recovered-draft"
      aria-label="Recovered note draft"
    >
      <p role="alert">
        This file could not be opened. Your unsaved draft is kept below. You can
        select and copy it to another note.
      </p>
      <textarea readOnly aria-label="Recovered draft" value={contents} />
      <button
        type="button"
        onClick={() => {
          if (
            !window.confirm(
              "Discard this recovered draft? This cannot be undone.",
            )
          )
            return;
          clearDocumentDraft(documentDraftKey(vaultId, path));
          onDiscard();
        }}
      >
        Discard recovered draft
      </button>
    </section>
  );
}
