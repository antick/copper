import { afterEach, expect, it } from "vitest";
import {
  clearDocumentDraft,
  documentDraftKey,
  documentDraftTargets,
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
});
