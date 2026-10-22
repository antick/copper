import { EditorView } from "@codemirror/view";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushOpenDocuments } from "@/lib/copper/events";
import type { DiskRevision } from "@/lib/copper/files";
import { DOCUMENT_SAVE_DELAY_MS } from "../../../shared/document-save";
import { CopperEditor } from "./copper-editor";
import {
  clearDocumentDraft,
  documentDraftKey,
  keepDocumentDraft,
  readDocumentDraft,
} from "./document-drafts";
import { documentSaveQueue } from "./document-save-queue";
import { withDocumentWriteLock } from "./document-write-lock";
import { fileKeys } from "./file-keys";

const mocks = vi.hoisted(() => ({ disk: "Original", read: vi.fn() }));
vi.mock("@/features/settings/settings-provider", () => ({
  useSettings: () => ({ wrapping: true, attachmentFolder: "attachments" }),
}));
vi.mock("@/lib/copper", () => ({
  copper: {
    files: {
      read: (...args: unknown[]) => mocks.read(...args),
      save: async (
        _vaultId: string,
        path: string,
        contents: string,
        expectedHash?: string,
      ) => {
        if (expectedHash !== mocks.disk)
          throw Object.assign(new Error("The file changed on disk"), {
            code: "conflict",
          });
        mocks.disk = contents;
        return { path, hash: contents, size: contents.length, mtimeNs: 2 };
      },
    },
  },
}));

const vaultId = "cached-note-loading";
const path = "Note.md";
const key = documentDraftKey(vaultId, path);
const clients: QueryClient[] = [];
type FilePayload = [string, DiskRevision];

function payload(): FilePayload {
  return [
    mocks.disk,
    { path, hash: mocks.disk, size: mocks.disk.length, mtimeNs: 1 },
  ];
}

function pendingRead() {
  let resolve!: (value: FilePayload) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<FilePayload>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  mocks.read.mockReturnValueOnce(promise);
  return { resolve, reject };
}

function mountCached() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  clients.push(client);
  client.setQueryData(fileKeys.detail(vaultId, path), payload());
  const node = () => (
    <QueryClientProvider client={client}>
      <CopperEditor vaultId={vaultId} path={path} />
    </QueryClientProvider>
  );
  return { ...render(node()), client, node };
}

async function editorView() {
  const view = EditorView.findFromDOM(
    await screen.findByRole("textbox", { name: "Markdown editor" }),
  );
  if (!view) throw new Error("Editor is missing");
  return view;
}

function edit(view: EditorView, contents: string) {
  act(() =>
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: contents },
    }),
  );
}

beforeEach(() => {
  mocks.disk = "Original";
  mocks.read.mockReset().mockImplementation(async () => payload());
});

afterEach(async () => {
  const queue = documentSaveQueue(
    key,
    async () => undefined,
    DOCUMENT_SAVE_DELAY_MS,
    vaultId,
  );
  queue.pause();
  cleanup();
  queue.cancel();
  await queue.settle();
  clearDocumentDraft(key);
  for (const client of clients.splice(0)) client.clear();
});

it("waits for a cached note's disk read, then saves edits across reopening", async () => {
  const read = pendingRead();
  const result = mountCached();

  expect(screen.getByText("Opening file…")).toBeVisible();
  expect(screen.queryByRole("textbox", { name: "Markdown editor" })).toBeNull();

  await act(async () => read.resolve(payload()));
  edit(await editorView(), "Tracked after opening");
  expect(readDocumentDraft(key)?.contents).toBe("Tracked after opening");
  await act(() => flushOpenDocuments(vaultId));
  expect(mocks.disk).toBe("Tracked after opening");
  result.unmount();
  render(result.node());
  expect((await editorView()).state.doc.toString()).toBe(
    "Tracked after opening",
  );
  expect(readDocumentDraft(key)).toBeUndefined();
});

it("uses refreshed disk text and its revision before accepting edits", async () => {
  const read = pendingRead();
  mountCached();
  expect(screen.queryByRole("textbox", { name: "Markdown editor" })).toBeNull();

  mocks.disk = "External work after the cached read";
  await act(async () => read.resolve(payload()));
  const view = await editorView();
  expect(view.state.doc.toString()).toBe("External work after the cached read");
  edit(view, "External work with my new edits");
  await act(() => flushOpenDocuments(vaultId));
  expect(mocks.disk).toBe("External work with my new edits");
});

it("keeps an initialized editor editable during a later background read", async () => {
  const result = mountCached();
  const view = await editorView();
  const read = pendingRead();
  act(() => {
    void result.client.invalidateQueries({
      queryKey: fileKeys.detail(vaultId, path),
    });
  });
  await waitFor(() =>
    expect(
      result.client.getQueryState(fileKeys.detail(vaultId, path))?.fetchStatus,
    ).toBe("fetching"),
  );

  expect(await editorView()).toBe(view);
  expect(view.state.readOnly).toBe(false);
  edit(view, "Typed during a background refresh");
  expect(readDocumentDraft(key)?.contents).toBe(
    "Typed during a background refresh",
  );
  await act(async () => read.resolve(payload()));
  expect(view.state.doc.toString()).toBe("Typed during a background refresh");
  await act(() => flushOpenDocuments(vaultId));
  expect(mocks.disk).toBe("Typed during a background refresh");
});

it("preserves a property write lock when the initial disk read completes", async () => {
  const read = pendingRead();
  mountCached();
  let completeWrite!: () => void;
  const writeReady = new Promise<void>((resolve) => {
    completeWrite = resolve;
  });
  let writing!: Promise<FilePayload>;
  act(() => {
    writing = withDocumentWriteLock(vaultId, path, async () => {
      await writeReady;
      mocks.disk = "---\nstatus: done\n---\nOriginal";
      return payload();
    });
  });
  try {
    await act(async () => read.resolve(payload()));
    const view = await editorView();
    expect(view.state.readOnly).toBe(true);
    edit(view, "Blocked during property write");
    expect(view.state.doc.toString()).toBe("Original");

    await act(async () => {
      completeWrite();
      await writing;
    });
    expect(view.state.readOnly).toBe(false);
    expect(view.state.doc.toString()).toContain("status: done");
    edit(view, "---\nstatus: done\n---\nEdited after property write");
    await act(() => flushOpenDocuments(vaultId));
    expect(mocks.disk).toContain("status: done");
    expect(mocks.disk).toContain("Edited after property write");
  } finally {
    completeWrite();
    await act(async () => writing);
  }
});

it("recovers a retained draft when the cached note's fresh read finds no file", async () => {
  keepDocumentDraft(key, {
    contents: "My retained draft",
    baseHash: "Original",
  });
  const read = pendingRead();
  mountCached();
  expect(screen.queryByRole("textbox", { name: "Markdown editor" })).toBeNull();

  await act(async () => {
    read.reject(
      Object.assign(new Error("File was removed"), { code: "not_found" }),
    );
  });
  expect(
    await screen.findByRole("textbox", { name: "Recovered draft" }),
  ).toHaveValue("My retained draft");
  expect(readDocumentDraft(key)?.contents).toBe("My retained draft");
  expect(mocks.disk).toBe("Original");
});
