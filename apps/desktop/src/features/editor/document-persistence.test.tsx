import { undo } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushOpenDocuments } from "@/lib/copper/events";
import { DOCUMENT_SAVE_DELAY_MS } from "../../../shared/document-save";
import { CopperEditor } from "./copper-editor";
import {
  clearDocumentDraft,
  documentDraftKey,
  readDocumentDraft,
} from "./document-drafts";
import { documentSaveQueue } from "./document-save-queue";

const mocks = vi.hoisted(() => ({
  disk: "Original",
  fail: false,
  saveBarrier: undefined as Promise<void> | undefined,
  save: vi.fn(),
  importAttachment: vi.fn(),
  listeners: new Set<(event: unknown) => void>(),
  settings: { wrapping: true, attachmentFolder: "Attachments" },
}));
vi.mock("@/features/settings/settings-provider", () => ({
  useSettings: () => mocks.settings,
}));
vi.mock("@/lib/copper", () => ({
  copper: {
    files: {
      read: async () => [
        mocks.disk,
        {
          path: "Note.md",
          hash: mocks.disk,
          size: mocks.disk.length,
          mtimeNs: 1,
        },
      ],
      save: async (
        _vault: string,
        path: string,
        contents: string,
        expectedHash?: string,
      ) => {
        mocks.save(contents);
        if (mocks.saveBarrier) await mocks.saveBarrier;
        if (mocks.fail) throw new Error("Disk is full");
        if (mocks.disk !== expectedHash)
          throw Object.assign(new Error("This file changed on disk"), {
            code: "conflict",
          });
        mocks.disk = contents;
        return { path, hash: contents, size: contents.length, mtimeNs: 2 };
      },
      importAttachment: (...args: unknown[]) => mocks.importAttachment(...args),
    },
    search: { indexFile: async () => undefined },
  },
}));
const key = documentDraftKey("v", "Note.md");
beforeEach(() => {
  mocks.disk = "Original";
  mocks.fail = false;
  mocks.saveBarrier = undefined;
  mocks.save.mockClear();
  mocks.importAttachment.mockReset();
  mocks.settings = { wrapping: true, attachmentFolder: "Attachments" };
  if (!window.copperDesktop) throw new Error("Test desktop bridge missing");
  window.copperDesktop.on = (_channel, handler) => {
    mocks.listeners.add(handler);
    return () => {
      mocks.listeners.delete(handler);
    };
  };
});
afterEach(async () => {
  cleanup();
  const queue = documentSaveQueue(
    key,
    async () => undefined,
    DOCUMENT_SAVE_DELAY_MS,
    "v",
  );
  queue.cancel();
  await queue.settle();
  clearDocumentDraft(key);
  mocks.listeners.clear();
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30000 } },
  });
  const node = (preview = true) => (
    <QueryClientProvider client={client}>
      <CopperEditor vaultId="v" path="Note.md" livePreviewEnabled={preview} />
    </QueryClientProvider>
  );
  const result = render(node());
  return { ...result, node, client };
}
async function view() {
  const result = EditorView.findFromDOM(
    await screen.findByRole("textbox", { name: /editor/i }),
  );
  if (!result) throw new Error("Editor view missing");
  return result;
}
async function edit(contents: string) {
  const editor = await view();
  act(() =>
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: contents },
    }),
  );
  return editor;
}
it("keeps saved text, selection and undo when switching source mode and wrapping", async () => {
  const result = mount();
  const editor = await edit("Saved new work");
  await act(() => flushOpenDocuments());
  result.rerender(result.node(false));
  expect(await view()).toBe(editor);
  expect(editor.state.doc.toString()).toBe("Saved new work");
  mocks.settings = { ...mocks.settings, wrapping: false };
  result.rerender(result.node(false));
  expect(editor.state.doc.toString()).toBe("Saved new work");
  act(() => {
    expect(undo(editor)).toBe(true);
  });
  expect(editor.state.doc.toString()).toBe("Original");
  await act(() => flushOpenDocuments());
});
it("reopens the latest cached saved text rather than the initial disk read", async () => {
  const result = mount();
  await edit("Saved new work");
  await act(() => flushOpenDocuments());
  result.unmount();
  render(
    <QueryClientProvider client={result.client}>
      <CopperEditor vaultId="v" path="Note.md" />
    </QueryClientProvider>,
  );
  expect((await view()).state.doc.toString()).toBe("Saved new work");
});
it("keeps a failed draft across tab unmount and restores it for retry", async () => {
  const result = mount();
  await edit("Keep my draft");
  mocks.fail = true;
  await act(async () => {
    await expect(flushOpenDocuments()).rejects.toThrow("Disk is full");
  });
  result.unmount();
  expect(readDocumentDraft(key)?.contents).toBe("Keep my draft");
  const restored = mount();
  expect((await view()).state.doc.toString()).toBe("Keep my draft");
  expect(mocks.disk).toBe("Original");
  mocks.fail = false;
  await act(() => flushOpenDocuments());
  expect(mocks.disk).toBe("Keep my draft");
  expect(readDocumentDraft(key)).toBeUndefined();
  restored.unmount();
});
it("finishes a successful save when draft storage cleanup fails", async () => {
  mount();
  await edit("Saved to disk");
  const removeItem = vi
    .spyOn(Object.getPrototypeOf(localStorage), "removeItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  try {
    let failure: unknown;
    await act(async () => {
      try {
        await flushOpenDocuments();
      } catch (cause) {
        failure = cause;
      }
    });
    expect(failure).toBeUndefined();
    expect(mocks.disk).toBe("Saved to disk");
    expect(readDocumentDraft(key)).toBeUndefined();
    expect(screen.queryByRole("alert")).toBeNull();
  } finally {
    removeItem.mockRestore();
  }
});
it("keeps a newer edit while an earlier save completes", async () => {
  mount();
  await edit("Earlier edit");
  let finishEarlier!: () => void;
  mocks.saveBarrier = new Promise<void>((resolve) => {
    finishEarlier = resolve;
  });
  const removeItem = vi
    .spyOn(Object.getPrototypeOf(localStorage), "removeItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  try {
    const saving = flushOpenDocuments();
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith("Earlier edit"),
    );
    await edit("Newer edit");
    let finishNewer!: () => void;
    mocks.saveBarrier = new Promise<void>((resolve) => {
      finishNewer = resolve;
    });
    await act(async () => {
      finishEarlier();
      await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    });
    expect(readDocumentDraft(key)?.contents).toBe("Newer edit");
    await act(async () => {
      finishNewer();
      await saving;
    });
    expect(mocks.disk).toBe("Newer edit");
    expect(readDocumentDraft(key)).toBeUndefined();
    expect(removeItem).toHaveBeenCalledOnce();
  } finally {
    removeItem.mockRestore();
  }
});
it("does not overwrite an external edit before choosing Reload Disk Version", async () => {
  mount();
  await edit("My draft");
  mocks.disk = "External work";
  act(() => {
    for (const listener of mocks.listeners)
      listener({ type: "modified", path: "Note.md" });
  });
  expect(
    await screen.findByRole("button", { name: "Reload Disk Version" }),
  ).toBeVisible();
  await new Promise((resolve) =>
    setTimeout(resolve, DOCUMENT_SAVE_DELAY_MS + 30),
  );
  expect(mocks.disk).toBe("External work");
  await act(async () => {
    await expect(flushOpenDocuments()).rejects.toThrow(/changed on disk/i);
  });
  const removeItem = vi
    .spyOn(Object.getPrototypeOf(localStorage), "removeItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  try {
    fireEvent.click(
      screen.getByRole("button", { name: "Reload Disk Version" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Keep Mine" })).toBeNull(),
    );
    expect((await view()).state.doc.toString()).toBe("External work");
    expect(readDocumentDraft(key)).toBeUndefined();
    expect(screen.queryByRole("alert")).toBeNull();
  } finally {
    removeItem.mockRestore();
  }
});
it("checks the disk version even if a watcher event is delayed, then saves only after Keep Mine", async () => {
  mount();
  await edit("My draft");
  mocks.disk = "External work";
  await act(async () => {
    await expect(flushOpenDocuments()).rejects.toThrow(/changed on disk/i);
  });
  expect(mocks.disk).toBe("External work");
  fireEvent.click(await screen.findByRole("button", { name: "Keep Mine" }));
  await waitFor(() => expect(mocks.disk).toBe("My draft"));
  expect(readDocumentDraft(key)).toBeUndefined();
});

it("locks editing during a property write and applies its revision before typing resumes", async () => {
  const { withDocumentWriteLock } = await import("./document-write-lock");
  mount();
  const editor = await view();
  let complete!: () => void;
  const ready = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let writing!: Promise<unknown>;
  act(() => {
    writing = withDocumentWriteLock("v", "Note.md", async () => {
      await flushOpenDocuments();
      await ready;
      mocks.disk = "---\nstatus: done\n---\nOriginal";
      return [
        mocks.disk,
        {
          path: "Note.md",
          hash: mocks.disk,
          size: mocks.disk.length,
          mtimeNs: 2,
        },
      ];
    });
  });
  expect(editor.state.readOnly).toBe(true);
  expect(editor.contentDOM).toHaveAttribute("contenteditable", "false");
  await act(async () => {
    complete();
    await writing;
  });
  expect(editor.state.readOnly).toBe(false);
  expect(editor.state.doc.toString()).toContain("status: done");
  act(() =>
    editor.dispatch({
      changes: { from: editor.state.doc.length, insert: "\nNew writing" },
    }),
  );
  await act(() => flushOpenDocuments());
  expect(mocks.disk).toContain("status: done");
  expect(mocks.disk).toContain("New writing");
});

it("blocks checkbox widgets and other document changes while a property write is locked", async () => {
  const { withDocumentWriteLock } = await import("./document-write-lock");
  mocks.disk = "- [ ] Keep my task\n";
  mount();
  const editor = await view();
  let complete!: () => void;
  const ready = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let writing!: Promise<unknown>;
  act(() => {
    writing = withDocumentWriteLock("v", "Note.md", async () => {
      await ready;
      mocks.disk = "---\nstatus: done\n---\n- [ ] Keep my task\n";
      return [
        mocks.disk,
        {
          path: "Note.md",
          hash: mocks.disk,
          size: mocks.disk.length,
          mtimeNs: 3,
        },
      ];
    });
  });
  fireEvent.click(screen.getByRole("checkbox"));
  act(() => editor.dispatch({ changes: { from: 0, insert: "Blocked" } }));
  expect(editor.state.doc.toString()).toBe("- [ ] Keep my task\n");
  await act(async () => {
    complete();
    await writing;
  });
  expect(editor.state.doc.toString()).toContain("status: done");
  fireEvent.click(screen.getByRole("checkbox"));
  await act(() => flushOpenDocuments());
  expect(mocks.disk).toContain("status: done");
  expect(mocks.disk).toContain("[x] Keep my task");
});
