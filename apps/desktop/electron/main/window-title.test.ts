import { describe, expect, it, vi } from "vitest";
import { pinWindowTitle } from "./window-title";

describe("pinWindowTitle", () => {
  it("keeps renderer document titles from replacing the app identity", () => {
    let handleTitleUpdate:
      | ((event: { preventDefault: () => void }) => void)
      | undefined;
    const on = vi.fn((event: string, handler: typeof handleTitleUpdate) => {
      if (event === "page-title-updated") handleTitleUpdate = handler;
    });
    const setTitle = vi.fn();
    const window = {
      webContents: { on },
      setTitle,
    } as unknown as Parameters<typeof pinWindowTitle>[0];
    const preventDefault = vi.fn();

    pinWindowTitle(window, "Copper Dev");
    handleTitleUpdate?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(setTitle).toHaveBeenCalledWith("Copper Dev");
  });
});
