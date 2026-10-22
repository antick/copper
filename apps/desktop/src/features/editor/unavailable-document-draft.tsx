import "./unavailable-document-draft.css";

export function UnavailableDocumentDraft({
  contents,
  message,
  onDiscard,
}: {
  contents?: string;
  message?: string;
  onDiscard: (contents: string) => void;
}) {
  return (
    <section
      className="copper-recovered-draft"
      aria-label="Recovered note draft"
    >
      <p role="alert">
        {message ?? "This file could not be opened."}{" "}
        {contents === undefined
          ? "No unsaved draft is available to recover."
          : "Your unsaved draft is kept below. Select and copy it to another note."}
      </p>
      {contents === undefined ? null : (
        <>
          <textarea readOnly aria-label="Recovered draft" value={contents} />
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Discard this recovered draft? This cannot be undone.",
                )
              )
                onDiscard(contents);
            }}
          >
            Discard recovered draft
          </button>
        </>
      )}
    </section>
  );
}
