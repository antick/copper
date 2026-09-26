import { openSearchPanel } from "@codemirror/search";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createCopperEditor } from "@/features/editor/create-editor";
import { ExternalChangeBanner } from "@/features/editor/external-change-banner";
import { fileKeys } from "@/features/editor/file-keys";
import { loadVaultImage } from "@/features/editor/load-vault-image";
import { useDocumentSave } from "@/features/editor/use-document-save";
import type { SupportedFileKind } from "@/features/file-tree/types";
import { useSettings } from "@/features/settings/settings-provider";
import { copper } from "@/lib/copper";
import {
  type FlushDocumentsDetail,
  markCopperSave,
  markDocumentDirty,
} from "@/lib/copper/events";

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
  onSaveStatus?: (status: "saved" | "dirty" | "saving" | "error") => void;
  onInteraction?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ReturnType<typeof createCopperEditor> | null>(null);
  const onInteractionRef = useRef(onInteraction);
  onInteractionRef.current = onInteraction;
  const settings = useSettings();
  const [dirty, setDirty] = useState(false);
  const documentQuery = useQuery({
    queryKey: fileKeys.detail(vaultId, path),
    queryFn: () => copper.files.read(vaultId, path),
  });
  const scheduleSave = useDocumentSave(async (contents) => {
    markCopperSave(vaultId, path);
    onSaveStatus?.("saving");
    try {
      await copper.files.save(vaultId, path, contents);
      setDirty(false);
      markDocumentDirty(vaultId, path, false);
      onSaveStatus?.("saved");
    } catch (error) {
      onSaveStatus?.("error");
      throw error;
    }
  });

  useEffect(() => {
    onSaveStatus?.("saved");
    markDocumentDirty(vaultId, path, false);
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
    const search = () => {
      const view = viewRef.current;
      if (view) openSearchPanel(view);
    };
    const flushAll = (event: Event) => {
      const request = event as CustomEvent<FlushDocumentsDetail>;
      request.detail.enqueue(scheduleSave.flush());
    };
    window.addEventListener("copper:save-document", flush);
    window.addEventListener("copper:flush-document", flushRequest);
    window.addEventListener("copper:flush-documents", flushAll);
    window.addEventListener("copper:search-document", search);
    return () => {
      window.removeEventListener("copper:save-document", flush);
      window.removeEventListener("copper:flush-document", flushRequest);
      window.removeEventListener("copper:flush-documents", flushAll);
      window.removeEventListener("copper:search-document", search);
      markDocumentDirty(vaultId, path, false);
    };
  }, [onSaveStatus, path, scheduleSave, vaultId]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const payload = documentQuery.data;
    if (!host || !payload) {
      return;
    }
    const view = createCopperEditor({
      parent: host,
      doc: payload[0],
      loadImage: async (imagePath) =>
        (await loadVaultImage(vaultId, imagePath)).url,
      onDocChanged: (contents) => {
        onInteractionRef.current?.();
        setDirty(true);
        markDocumentDirty(vaultId, path, true);
        onSaveStatus?.("dirty");
        scheduleSave(contents);
      },
      path,
      mode: fileKind === "markdown" ? "markdown" : "source",
      livePreviewEnabled: fileKind === "markdown" && livePreviewEnabled,
      wrapping: settings.wrapping,
      onDropPaths:
        fileKind === "markdown"
          ? (paths) => {
              void (async () => {
                const snippets: string[] = [];
                for (const source of paths) {
                  const relative = await copper.files.importAttachment(
                    vaultId,
                    source,
                    settings.attachmentFolder,
                  );
                  const name = relative.split("/").at(-1) ?? relative;
                  snippets.push(
                    IMAGE_EXT.test(relative)
                      ? `![${name}](${relative})`
                      : `[${name}](${relative})`,
                  );
                }
                const cursor = view.state.selection.main.head;
                view.dispatch({
                  changes: { from: cursor, insert: snippets.join("\n") },
                });
              })().catch(() => {
                /* Native cancellation or import error leaves the document unchanged. */
              });
            }
          : undefined,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [
    documentQuery.data,
    fileKind,
    livePreviewEnabled,
    scheduleSave,
    settings.attachmentFolder,
    settings.wrapping,
    vaultId,
    onSaveStatus,
    path,
  ]);

  if (documentQuery.isError) {
    return (
      <div className="copper-empty">This file could not be opened safely.</div>
    );
  }
  if (!documentQuery.data) {
    return <div className="copper-empty">Opening file…</div>;
  }

  return (
    <div className="copper-editor-document">
      <ExternalChangeBanner
        vaultId={vaultId}
        path={path}
        dirty={dirty}
        onReload={() => {
          scheduleSave.cancel();
          setDirty(false);
          markDocumentDirty(vaultId, path, false);
          onSaveStatus?.("saved");
          void documentQuery.refetch();
        }}
        onKeep={() => void scheduleSave.flush().catch(() => undefined)}
      />
      <div
        ref={hostRef}
        className="copper-editor-host"
        data-testid="copper-editor"
      />
    </div>
  );
}
