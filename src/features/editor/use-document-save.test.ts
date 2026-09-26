import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDocumentSave } from "@/features/editor/use-document-save";

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
});
