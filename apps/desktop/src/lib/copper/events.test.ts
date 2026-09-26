import { afterEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/app/query-client";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";
import {
  flushOpenDocuments,
  handleVaultFileSystemEvent,
  hasDirtyDocuments,
  invalidateVaultNoteQueries,
  isRecentVaultGitOperation,
  markDocumentDirty,
  markVaultGitOperation,
} from "@/lib/copper/events";

const vaultId = "vault";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Vault filesystem invalidation", () => {
  it("tracks dirty documents for restart warnings", () => {
    markDocumentDirty("vault", "note.md", true);
    expect(hasDirtyDocuments()).toBe(true);
    markDocumentDirty("vault", "note.md", false);
    expect(hasDirtyDocuments()).toBe(false);
  });

  it("marks a recent Git operation window", () => {
    markVaultGitOperation(vaultId);
    expect(isRecentVaultGitOperation(vaultId)).toBe(true);
    expect(isRecentVaultGitOperation("other")).toBe(false);
  });

  it("flushes every subscribed document", async () => {
    const flushed: string[] = [];
    const stop = () => {
      window.removeEventListener("copper:flush-documents", onFlush);
    };
    function onFlush(event: Event) {
      const detail = (
        event as CustomEvent<{ enqueue: (p: Promise<void>) => void }>
      ).detail;
      detail.enqueue(
        Promise.resolve().then(() => {
          flushed.push("note");
        }),
      );
    }
    window.addEventListener("copper:flush-documents", onFlush);
    await flushOpenDocuments();
    stop();
    expect(flushed).toEqual(["note"]);
  });

  it("indexes created and externally modified notes before invalidating scopes", async () => {
    const indexFile = vi
      .spyOn(copper.search, "indexFile")
      .mockResolvedValue(undefined);
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    await handleVaultFileSystemEvent(vaultId, {
      type: "created",
      path: "Projects/new.md",
    });
    await handleVaultFileSystemEvent(vaultId, {
      type: "modified",
      path: "Projects/new.md",
    });

    expect(indexFile).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: vaultKeys.tree(vaultId),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["vault", vaultId, "notes"],
    });
  });

  it("removes deleted index entries before invalidating cached note scopes", async () => {
    const removeIndexed = vi
      .spyOn(copper.search, "removeIndexed")
      .mockResolvedValue(undefined);
    const removeQueries = vi
      .spyOn(queryClient, "removeQueries")
      .mockImplementation(() => undefined);
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    await handleVaultFileSystemEvent(vaultId, {
      type: "removed",
      path: "Projects/deleted.md",
    });

    expect(removeIndexed).toHaveBeenCalledWith(vaultId, "Projects/deleted.md");
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["file", vaultId, "Projects/deleted.md"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["vault", vaultId, "notes"],
    });
  });

  it("updates both sides of a rename before invalidating all note scopes", async () => {
    const order: string[] = [];
    vi.spyOn(copper.search, "removeIndexed").mockImplementation(async () => {
      order.push("remove");
    });
    vi.spyOn(copper.search, "indexFile").mockImplementation(async () => {
      order.push("index");
    });
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(async () => {
      order.push("invalidate");
    });

    await handleVaultFileSystemEvent(vaultId, {
      type: "renamed",
      from: "Projects/old.md",
      to: "Projects/new.md",
    });

    expect(order.slice(0, 3)).toEqual(["remove", "index", "invalidate"]);
  });

  it("invalidates the tree and note-query prefix together", async () => {
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    await invalidateVaultNoteQueries(vaultId);

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: vaultKeys.tree(vaultId),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["vault", vaultId, "notes"],
    });
  });
});
