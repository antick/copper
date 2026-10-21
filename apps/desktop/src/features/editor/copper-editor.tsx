import { openSearchPanel } from "@codemirror/search";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  createCopperEditor,
  reconfigureCopperEditor,
  setCopperEditorReadOnly,
  syncCopperEditorDocument,
} from "@/features/editor/create-editor";
import {
  type DocumentWriteDetail,
  isDocumentWriteLocked,
  waitForDocumentWrite,
} from "@/features/editor/document-write-lock";
import { ExternalChangeBanner } from "@/features/editor/external-change-banner";
import { loadVaultImage } from "@/features/editor/load-vault-image";
import { UnavailableDocumentDraft } from "@/features/editor/unavailable-document-draft";
import {
  type DocumentSaveStatus,
  useEditorDocument,
} from "@/features/editor/use-editor-document";
import type { SupportedFileKind } from "@/features/file-tree/types";
import { useSettings } from "@/features/settings/settings-provider";
import { copper } from "@/lib/copper";
import type { FlushDocumentsDetail } from "@/lib/copper/events";
import { DOCUMENT_WRITE_EVENT } from "../../../shared/document-save";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export function CopperEditor({
  vaultId,
  path,
  livePreviewEnabled = true,
  fileKind = "markdown",
  onSaveStatus,
  onInteraction,
}: {
  vaultId: string;
  path: string;
  livePreviewEnabled?: boolean;
  fileKind?: SupportedFileKind;
  onSaveStatus?: (status: DocumentSaveStatus) => void;
  onInteraction?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ReturnType<typeof createCopperEditor> | null>(null);
  const settings = useSettings();
  const document = useEditorDocument(vaultId, path, onSaveStatus);
  const current = useRef({ document, settings, onInteraction });
  current.current = { document, settings, onInteraction };
  const { scheduleSave } = document;

  useEffect(() => {
    const flush = () => void scheduleSave.flush().catch(() => undefined);
    const flushRequest = (event: Event) => {
      const request = event as CustomEvent<{
        handled: boolean;
        resolve: () => void;
        reject: (error: unknown) => void;
      }>;
      request.detail.handled = true;
      void scheduleSave
        .flush()
        .then(request.detail.resolve, request.detail.reject);
    };
    const flushAll = (event: Event) => {
      const detail = (event as CustomEvent<FlushDocumentsDetail>).detail;
      if (detail.vaultId !== undefined && detail.vaultId !== vaultId) return;
      detail.enqueue(scheduleSave.flush());
    };
    const search = () => {
      if (viewRef.current) openSearchPanel(viewRef.current);
    };
    const write = (event: Event) => {
      const detail = (event as CustomEvent<DocumentWriteDetail>).detail;
      if (detail.vaultId !== vaultId || detail.path !== path) return;
      const view = viewRef.current;
      if (!view) return;
      if (detail.payload && !current.current.document.draft()) {
        current.current.document.acceptRevision(detail.payload[1]);
        syncCopperEditorDocument(view, detail.payload[0]);
      }
      setCopperEditorReadOnly(view, detail.locked);
    };
    window.addEventListener(DOCUMENT_WRITE_EVENT, write);
    window.addEventListener("copper:save-document", flush);
    window.addEventListener("copper:flush-document", flushRequest);
    window.addEventListener("copper:flush-documents", flushAll);
    window.addEventListener("copper:search-document", search);
    return () => {
      window.removeEventListener(DOCUMENT_WRITE_EVENT, write);
      window.removeEventListener("copper:save-document", flush);
      window.removeEventListener("copper:flush-document", flushRequest);
      window.removeEventListener("copper:flush-documents", flushAll);
      window.removeEventListener("copper:search-document", search);
    };
  }, [scheduleSave, path, vaultId]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const payload = document.query.data;
    if (!host || !payload) return;
    if (viewRef.current) {
      const next = payload[0];
      const view = viewRef.current;
      if (
        !document.draft() &&
        !scheduleSave.hasPending() &&
        next !== view.state.doc.toString()
      ) {
        syncCopperEditorDocument(view, next);
      }
      return;
    }
    const view = createCopperEditor({
      parent: host,
      doc: document.draft()?.contents ?? payload[0],
      path,
      mode: fileKind === "markdown" ? "markdown" : "source",
      livePreviewEnabled: fileKind === "markdown" && livePreviewEnabled,
      wrapping: settings.wrapping,
      loadImage: async (imagePath) =>
        (await loadVaultImage(vaultId, imagePath)).url,
      onDocChanged: (contents) => {
        current.current.onInteraction?.();
        current.current.document.changed(contents);
      },
      onDropPaths:
        fileKind === "markdown"
          ? (paths) => {
              void (async () => {
                for (const source of paths) {
                  const relative = await copper.files.importAttachment(
                    vaultId,
                    source,
                    current.current.settings.attachmentFolder,
                  );
                  await waitForDocumentWrite(vaultId, path);
                  if (viewRef.current !== view) return;
                  const name = relative.split("/").at(-1) ?? relative;
                  const insert = IMAGE_EXT.test(relative)
                    ? `![${name}](${relative})`
                    : `[${name}](${relative})`;
                  view.dispatch({
                    changes: {
                      from: view.state.selection.main.head,
                      insert: `${insert}\n`,
                    },
                  });
                }
              })().catch((cause) => {
                current.current.document.setError(
                  cause instanceof Error
                    ? cause.message
                    : "The attachment could not be imported. Please try again.",
                );
              });
            }
          : undefined,
    });
    viewRef.current = view;
    setCopperEditorReadOnly(view, isDocumentWriteLocked(vaultId, path));
  }, [
    document.query.data,
    document.draft,
    fileKind,
    livePreviewEnabled,
    path,
    scheduleSave,
    settings.wrapping,
    vaultId,
  ]);

  useLayoutEffect(() => {
    if (viewRef.current)
      reconfigureCopperEditor(
        viewRef.current,
        livePreviewEnabled,
        settings.wrapping,
      );
  }, [livePreviewEnabled, settings.wrapping]);
  useLayoutEffect(
    () => () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    },
    [],
  );

  if (document.query.isError && !document.query.data && document.draft()) {
    return (
      <UnavailableDocumentDraft
        vaultId={vaultId}
        path={path}
        contents={document.draft()?.contents ?? ""}
        onDiscard={() => {
          scheduleSave.cancel();
          void document.query.refetch();
        }}
      />
    );
  }
  if (document.query.isError && !document.query.data)
    return (
      <div className="copper-empty">This file could not be opened safely.</div>
    );
  if (!document.query.data)
    return <div className="copper-empty">Opening file…</div>;
  return (
    <div className="copper-editor-document">
      <ExternalChangeBanner
        visible={document.conflict}
        onReload={document.reload}
        onKeep={document.keep}
      />
      {document.error && !document.conflict ? (
        <div role="alert" className="copper-conflict-banner">
          {document.error} Your draft is kept.{" "}
          <button
            type="button"
            onClick={() => void scheduleSave.flush().catch(() => undefined)}
          >
            Retry save
          </button>
        </div>
      ) : null}
      <div
        ref={hostRef}
        className="copper-editor-host"
        data-testid="copper-editor"
      />
    </div>
  );
}
