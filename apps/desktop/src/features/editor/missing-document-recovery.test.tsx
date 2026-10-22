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
import { fileKeys } from "@/features/editor/file-keys";
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
  missing: false,
  fail: false,
  saveNotFound: false,
  saveBarrier: undefined as Promise<void> | undefined,
  save: vi.fn(),
  listeners: new Set<(event: unknown) => void>(),
  settings: { wrapping: true, attachmentFolder: "Attachments" },
}));
vi.mock("@/features/settings/settings-provider", () => ({
  useSettings: () => mocks.settings,
}));
vi.mock("@/lib/copper", () => ({
  copper: {
    files: {
      read: async () => {
        if (mocks.missing)
          throw Object.assign(new Error("This file no longer exists"), {
            code: "not_found",
          });
        return [
          mocks.disk,
          {
            path: "Note.md",
            hash: mocks.disk,
            size: mocks.disk.length,
            mtimeNs: 1,
          },
        ];
      },
      save: async (
        _vault: string,
        path: string,
        contents: string,
        expectedHash?: string,
      ) => {
        mocks.save(contents);
        if (mocks.saveBarrier) await mocks.saveBarrier;
        if (mocks.fail) throw new Error("Disk is full");
        if (mocks.saveNotFound)
          throw Object.assign(new Error("This file no longer exists"), {
            code: "not_found",
          });
        if (mocks.disk !== expectedHash)
          throw Object.assign(new Error("This file changed on disk"), {
            code: "conflict",
          });
        mocks.disk = contents;
        return { path, hash: contents, size: contents.length, mtimeNs: 2 };
      },
    },
    search: { indexFile: async () => undefined },
  },
}));

const key = documentDraftKey("v", "Note.md");

beforeEach(() => {
  mocks.disk = "Original";
  mocks.missing = false;
  mocks.fail = false;
  mocks.saveNotFound = false;
  mocks.saveBarrier = undefined;
  mocks.save.mockClear();
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
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  const node = () => (
    <QueryClientProvider client={client}>
      <CopperEditor vaultId="v" path="Note.md" />
    </QueryClientProvider>
  );
  const result = render(node());
  return { ...result, node, client };
}

async function edit(contents: string) {
  const editor = EditorView.findFromDOM(
    await screen.findByRole("textbox", { name: /editor/i }),
  );
  if (!editor) throw new Error("Editor view missing");
  act(() =>
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: contents },
    }),
  );
}

it.each([
  { name: "removed", event: { type: "removed", path: "Note.md" } },
  {
    name: "renamed",
    event: { type: "renamed", from: "Note.md", to: "Moved.md" },
  },
])(
  "keeps a durable draft after a pending save sees a $name",
  async ({ event }) => {
    const result = mount();
    await edit("My unsaved draft");
    let finishSave!: () => void;
    mocks.saveBarrier = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    let saving!: Promise<void>;
    act(() => {
      saving = flushOpenDocuments();
    });

    try {
      await waitFor(() =>
        expect(mocks.save).toHaveBeenCalledWith("My unsaved draft"),
      );
      mocks.missing = true;
      act(() => {
        for (const listener of mocks.listeners) listener(event);
      });

      expect(
        await screen.findByRole("textbox", { name: "Recovered draft" }),
      ).toHaveValue("My unsaved draft");
      expect(screen.queryByRole("button", { name: "Retry save" })).toBeNull();
      expect(
        result.client.getQueryData(fileKeys.detail("v", "Note.md")),
      ).toBeDefined();

      mocks.saveNotFound = true;
      await act(async () => {
        finishSave();
        await expect(saving).rejects.toThrow("This file no longer exists");
      });
      expect(readDocumentDraft(key)?.contents).toBe("My unsaved draft");
      expect(JSON.parse(localStorage.getItem(key) ?? "null")).toEqual({
        contents: "My unsaved draft",
        baseHash: "Original",
      });

      result.unmount();
      mocks.save.mockClear();
      render(result.node());
      expect(
        await screen.findByRole("textbox", { name: "Recovered draft" }),
      ).toHaveValue("My unsaved draft");
      expect(mocks.save).not.toHaveBeenCalled();
    } finally {
      finishSave();
    }
  },
);

it("shows the cached draft when a save reports not found", async () => {
  const result = mount();
  await edit("Recover me from the save error");
  mocks.saveNotFound = true;

  await act(async () => {
    await expect(flushOpenDocuments()).rejects.toThrow(
      "This file no longer exists",
    );
  });

  expect(
    result.client.getQueryData(fileKeys.detail("v", "Note.md")),
  ).toBeDefined();
  expect(screen.getByRole("textbox", { name: "Recovered draft" })).toHaveValue(
    "Recover me from the save error",
  );
  expect(screen.queryByRole("button", { name: "Retry save" })).toBeNull();
  expect(readDocumentDraft(key)?.contents).toBe(
    "Recover me from the save error",
  );
});

it("keeps newer edits when a save already running completes after a rename", async () => {
  mount();
  await edit("Earlier edit");
  let finishSave!: () => void;
  mocks.saveBarrier = new Promise<void>((resolve) => {
    finishSave = resolve;
  });
  let saving!: Promise<void>;
  act(() => {
    saving = flushOpenDocuments();
  });

  try {
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith("Earlier edit"),
    );
    await edit("Newer edit");
    mocks.missing = true;
    act(() => {
      for (const listener of mocks.listeners)
        listener({ type: "renamed", from: "Note.md", to: "Moved.md" });
    });

    expect(
      await screen.findByRole("textbox", { name: "Recovered draft" }),
    ).toHaveValue("Newer edit");
    await act(async () => {
      finishSave();
      await expect(saving).rejects.toThrow(/Unsaved note drafts remain/i);
    });
    expect(readDocumentDraft(key)?.contents).toBe("Newer edit");
    expect(
      screen.getByRole("textbox", { name: "Recovered draft" }),
    ).toHaveValue("Newer edit");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  } finally {
    finishSave();
  }
});

it("unblocks Vault flush after discarding a missing-file draft", async () => {
  mount();
  await edit("Keep this draft until I confirm discard");
  let finishSave!: () => void;
  mocks.saveBarrier = new Promise<void>((resolve) => {
    finishSave = resolve;
  });
  let saving!: Promise<void>;
  act(() => {
    saving = flushOpenDocuments();
  });

  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  try {
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        "Keep this draft until I confirm discard",
      ),
    );
    mocks.missing = true;
    mocks.saveNotFound = true;
    act(() => {
      for (const listener of mocks.listeners)
        listener({ type: "removed", path: "Note.md" });
    });
    await act(async () => {
      finishSave();
      await expect(saving).rejects.toThrow("This file no longer exists");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Discard recovered draft" }),
    );
    expect(readDocumentDraft(key)).toBeUndefined();
    await act(async () => {
      await flushOpenDocuments();
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No unsaved draft is available to recover.",
    );
  } finally {
    confirm.mockRestore();
    finishSave();
  }
});
