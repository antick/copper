import { afterEach, expect, it, vi } from "vitest";
import { DOCUMENT_SAVE_STATE_EVENT } from "../../../shared/document-save";
import {
  clearDocumentDraft,
  documentDraftKey,
  documentDraftTargets,
  hasDocumentDrafts,
  keepDocumentDraft,
  readDocumentDraft,
} from "./document-drafts";

const one = documentDraftKey("one", "Note.md");
const two = documentDraftKey("two", "Note.md");
afterEach(() => {
  clearDocumentDraft(one);
  clearDocumentDraft(two);
});
it("keeps the latest draft when an earlier save completes", () => {
  keepDocumentDraft(one, { contents: "newest", baseHash: "old" });
  clearDocumentDraft(one, "earlier");
  expect(readDocumentDraft(one)?.contents).toBe("newest");
  clearDocumentDraft(one, "newest");
  expect(readDocumentDraft(one)).toBeUndefined();
});
it("shadows a cleared draft when storage removal fails", () => {
  const draft = { contents: "saved text", baseHash: "old" };
  keepDocumentDraft(one, draft);
  const removeItem = vi
    .spyOn(Object.getPrototypeOf(localStorage), "removeItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  const changed = vi.fn();
  window.addEventListener(DOCUMENT_SAVE_STATE_EVENT, changed);
  try {
    expect(localStorage.getItem(one)).toBe(JSON.stringify(draft));
    expect(() => clearDocumentDraft(one)).not.toThrow();
    expect(readDocumentDraft(one)).toBeUndefined();
    expect(documentDraftTargets()).not.toContainEqual(
      expect.objectContaining({ key: one }),
    );
    expect(changed).toHaveBeenCalledOnce();
    expect(localStorage.getItem(one)).toBe("null");
  } finally {
    window.removeEventListener(DOCUMENT_SAVE_STATE_EVENT, changed);
    removeItem.mockRestore();
    clearDocumentDraft(one);
  }
});
it("preserves a newer draft when an older save completes", () => {
  const newest = { contents: "newest", baseHash: "old" };
  keepDocumentDraft(one, newest);
  const removeItem = vi
    .spyOn(Object.getPrototypeOf(localStorage), "removeItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  try {
    expect(() => clearDocumentDraft(one, "earlier")).not.toThrow();
    expect(removeItem).not.toHaveBeenCalled();
    expect(readDocumentDraft(one)).toEqual(newest);
  } finally {
    removeItem.mockRestore();
    clearDocumentDraft(one);
  }
});
it("keeps cleanup and new recovery drafts usable when all storage writes fail", () => {
  keepDocumentDraft(one, { contents: "saved text", baseHash: "old" });
  const storage = Object.getPrototypeOf(localStorage);
  const unavailable = () => {
    throw new Error("Storage unavailable");
  };
  const removeItem = vi
    .spyOn(storage, "removeItem")
    .mockImplementation(unavailable);
  const setItem = vi.spyOn(storage, "setItem").mockImplementation(unavailable);
  try {
    expect(() => clearDocumentDraft(one)).not.toThrow();
    expect(readDocumentDraft(one)).toBeUndefined();
    expect(hasDocumentDrafts("one")).toBe(false);
    const next = { contents: "new recovery text", baseHash: "saved" };
    expect(keepDocumentDraft(one, next)).toBe(false);
    expect(readDocumentDraft(one)).toEqual(next);
  } finally {
    removeItem.mockRestore();
    setItem.mockRestore();
    clearDocumentDraft(one);
  }
});
it("keeps an in-memory recovery draft when persistent writes fail", () => {
  const draft = { contents: "recovery copy", baseHash: "old" };
  const setItem = vi
    .spyOn(Object.getPrototypeOf(localStorage), "setItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  try {
    expect(keepDocumentDraft(one, draft)).toBe(false);
    expect(readDocumentDraft(one)).toEqual(draft);
  } finally {
    setItem.mockRestore();
    clearDocumentDraft(one);
  }
});
it("isolates draft recovery by Vault and preserves persisted text", () => {
  keepDocumentDraft(one, { contents: "private one", baseHash: "a" });
  keepDocumentDraft(two, { contents: "private two", baseHash: "b" });
  expect(documentDraftTargets()).toEqual(
    expect.arrayContaining([
      { key: one, path: "Note.md", vaultId: "one" },
      { key: two, path: "Note.md", vaultId: "two" },
    ]),
  );
  expect(JSON.parse(localStorage.getItem(one) ?? "null")).toEqual({
    contents: "private one",
    baseHash: "a",
  });
  expect(hasDocumentDrafts("one")).toBe(true);
  expect(hasDocumentDrafts("two")).toBe(true);
  expect(hasDocumentDrafts("three")).toBe(false);
  expect(hasDocumentDrafts()).toBe(true);
  expect(documentDraftTargets("one")).toEqual([
    { key: one, path: "Note.md", vaultId: "one" },
  ]);
});
