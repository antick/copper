import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDocumentSave } from "@/features/editor/use-document-save";

afterEach(() => vi.useRealTimers());

describe("useDocumentSave", () => {
  it("debounces persistence without invoking save immediately", () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const { result } = renderHook(() => useDocumentSave(save, 400));

    act(() => {
      result.current("one");
      result.current("two");
    });
    expect(save).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("two");
    vi.useRealTimers();
  });

  it("does not save when flush or unmount occurs without an edit", async () => {
    const save = vi.fn(async () => undefined);
    const { result, unmount } = renderHook(() => useDocumentSave(save, 400));

    await act(() => result.current.flush());
    unmount();
    expect(save).not.toHaveBeenCalled();
  });

  it("flushes the latest pending buffer when the editor unmounts", () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const { result, unmount } = renderHook(() => useDocumentSave(save, 400));

    act(() => result.current("do not lose me"));
    unmount();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("do not lose me");
    vi.useRealTimers();
  });

  it("keeps a pending queue bound to its original Vault save callback", () => {
    vi.useFakeTimers();
    const saveA = vi.fn(async () => undefined);
    const saveB = vi.fn(async () => undefined);
    const { result, rerender, unmount } = renderHook(
      ({ queueKey, vaultId, save }) =>
        useDocumentSave(save, 400, queueKey, vaultId),
      {
        initialProps: {
          queueKey: "same-note-key",
          vaultId: "vault-a",
          save: saveA,
        },
      },
    );

    act(() => result.current("A pending text"));
    rerender({ queueKey: "same-note-key", vaultId: "vault-b", save: saveB });

    expect(saveB).not.toHaveBeenCalled();
    expect(saveA).toHaveBeenCalledWith("A pending text");
    act(() => result.current("B pending text"));
    unmount();
    expect(saveB).toHaveBeenCalledWith("B pending text");
  });

  it("keeps a pending task save bound to its original document callback", () => {
    vi.useFakeTimers();
    const saveIssue1 = vi.fn(async () => undefined);
    const saveIssue2 = vi.fn(async () => undefined);
    const { result, rerender, unmount } = renderHook(
      ({ documentId, save }) =>
        useDocumentSave(save, 400, undefined, "vault-a", documentId),
      {
        initialProps: {
          documentId: "ISSUE-1",
          save: saveIssue1,
        },
      },
    );

    act(() => result.current("ISSUE-1 pending text"));
    rerender({ documentId: "ISSUE-2", save: saveIssue2 });

    expect(saveIssue1).toHaveBeenCalledWith("ISSUE-1 pending text");
    expect(saveIssue2).not.toHaveBeenCalled();
    act(() => result.current("ISSUE-2 pending text"));
    unmount();
    expect(saveIssue2).toHaveBeenCalledWith("ISSUE-2 pending text");
  });
});
