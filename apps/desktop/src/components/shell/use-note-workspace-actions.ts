import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, useCallback, useState } from "react";
import { useFileNameDialog } from "@/features/file-tree/file-name-dialog";
import {
  isMarkdownPath,
  renamedPath,
  UNTITLED_NOTE,
} from "@/features/file-tree/file-names";
import type {
  SessionAction,
  SessionState,
} from "@/features/tabs/session-reducer";
import { copper } from "@/lib/copper";
import type { SearchHit } from "@/lib/copper/search";
import { fileName } from "@/lib/paths";

export function useNoteWorkspaceActions({
  vaultId,
  session,
  nav,
  folder,
  notes,
  activeIsMarkdown,
  updateSession,
}: {
  vaultId?: string;
  session: SessionState;
  nav: string;
  folder: string;
  notes: SearchHit[];
  activeIsMarkdown: boolean;
  updateSession: Dispatch<SessionAction>;
}) {
  const queryClient = useQueryClient();
  const { requestName, nameDialog } = useFileNameDialog();
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  function recordHistory(path: string, fromHistory = false) {
    if (fromHistory) return;
    setHistory((current) => {
      const trimmed = current.slice(0, historyIndex + 1);
      if (trimmed.at(-1) === path) return trimmed;
      const next = [...trimmed, path];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }

  function openPreview(path: string, fromHistory = false) {
    updateSession({ type: "open-preview", path });
    recordHistory(path, fromHistory);
  }

  function openPinned(path: string, fromHistory = false) {
    updateSession({ type: "open-pinned", path });
    recordHistory(path, fromHistory);
  }

  function pinActive() {
    if (session.activePath)
      updateSession({ type: "pin", path: session.activePath });
  }

  function goHistory(delta: number) {
    const nextIndex = historyIndex + delta;
    const path = history[nextIndex];
    if (!path) return;
    setHistoryIndex(nextIndex);
    openPreview(path, true);
  }

  const restoreHistory = useCallback((path?: string) => {
    setHistory(path ? [path] : []);
    setHistoryIndex(path ? 0 : -1);
  }, []);

  function renameSessionPaths(from: string, to: string) {
    const rename = (path: string) =>
      path === from || path.startsWith(`${from}/`)
        ? `${to}${path.slice(from.length)}`
        : path;
    updateSession({ type: "rename", from, to });
    setHistory((current) => current.map(rename));
  }

  function removeSessionPaths(path: string) {
    updateSession({ type: "remove", path });
    setHistory((current) => {
      const next = current.filter(
        (item) => item !== path && !item.startsWith(`${path}/`),
      );
      setHistoryIndex((index) => Math.min(index, next.length - 1));
      return next;
    });
  }

  async function refreshVaultData() {
    if (vaultId)
      await queryClient.invalidateQueries({ queryKey: ["vault", vaultId] });
  }

  async function flushActiveDocument() {
    let resolveFlush: () => void = () => undefined;
    let rejectFlush: (error: unknown) => void = () => undefined;
    const completion = new Promise<void>((resolve, reject) => {
      resolveFlush = resolve;
      rejectFlush = reject;
    });
    const detail = {
      handled: false,
      resolve: resolveFlush,
      reject: rejectFlush,
    };
    window.dispatchEvent(new CustomEvent("copper:flush-document", { detail }));
    if (detail.handled) await completion;
  }

  async function trashActiveFile(path = session.activePath) {
    if (!vaultId || !path) return;
    if (!window.confirm(`Move “${fileName(path)}” to the system Trash?`))
      return;
    try {
      await flushActiveDocument();
      await copper.files.trash(vaultId, path);
      await copper.search.removeIndexed(vaultId, path);
      queryClient.removeQueries({ queryKey: ["file", vaultId, path] });
      removeSessionPaths(path);
      await refreshVaultData();
    } catch (error) {
      window.alert(operationError("Couldn’t move the file to Trash", error));
    }
  }

  async function renameFileTo(path: string, name: string, title = false) {
    if (!vaultId) return;
    const nextPath = renamedPath(path, name, { title });
    if (path === nextPath) return;
    await flushActiveDocument();
    await copper.files.rename(vaultId, path, nextPath);
    await copper.search.removeIndexed(vaultId, path);
    if (isMarkdownPath(nextPath))
      await copper.search.indexFile(vaultId, nextPath);
    queryClient.removeQueries({ queryKey: ["file", vaultId, path] });
    renameSessionPaths(path, nextPath);
    await refreshVaultData();
  }

  function renameActiveFile(
    path = session.activePath,
    onReturnFocus?: () => void,
  ) {
    if (!vaultId || !path) return;
    requestName({
      title: "Rename file",
      label: "File name",
      initialValue: fileName(path),
      submitLabel: "Rename",
      onSubmit: (name) => renameFileTo(path, name),
      onReturnFocus,
    });
  }

  async function moveActiveArchive(
    restore: boolean,
    path = session.activePath,
  ) {
    if (
      !vaultId ||
      !path ||
      !(path === session.activePath ? activeIsMarkdown : isMarkdownPath(path))
    )
      return;
    try {
      await flushActiveDocument();
      const nextPath = restore
        ? await copper.files.restore(vaultId, path)
        : await copper.files.archive(vaultId, path);
      await copper.search.removeIndexed(vaultId, path);
      await copper.search.indexFile(vaultId, nextPath);
      queryClient.removeQueries({ queryKey: ["file", vaultId, path] });
      renameSessionPaths(path, nextPath);
      await refreshVaultData();
    } catch (error) {
      window.alert(
        operationError(
          restore ? "Couldn’t restore the note" : "Couldn’t archive the note",
          error,
        ),
      );
    }
  }

  async function createNote(targetFolderOverride?: string) {
    if (!vaultId) return;
    const existing = new Set(notes.map((note) => note.path));
    const targetFolder =
      targetFolderOverride ?? (nav === "folder" ? folder : "");
    const path = uniqueNotePath(existing, targetFolder);
    try {
      await copper.files.createFile(vaultId, path, "");
      await copper.search.indexFile(vaultId, path);
      await refreshVaultData();
      openPinned(path);
    } catch (error) {
      window.alert(operationError("Couldn’t create a note", error));
    }
  }

  return {
    nameDialog,
    renameFileTo,
    historyIndex,
    historyLength: history.length,
    restoreHistory,
    openPreview,
    openPinned,
    pinActive,
    goHistory,
    renameSessionPaths,
    removeSessionPaths,
    flushActiveDocument,
    trashActiveFile,
    renameActiveFile,
    moveActiveArchive,
    createNote,
  };
}

export type NoteWorkspaceActions = ReturnType<typeof useNoteWorkspaceActions>;

function operationError(message: string, error: unknown) {
  return error instanceof Error ? `${message}: ${error.message}` : message;
}

export function uniqueNotePath(existing: ReadonlySet<string>, folder = "") {
  const prefix = folder ? `${folder.replace(/\/+$/, "")}/` : "";
  let candidate = `${prefix}${UNTITLED_NOTE}.md`;
  let suffix = 2;
  while (existing.has(candidate)) {
    candidate = `${prefix}${UNTITLED_NOTE} ${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}
