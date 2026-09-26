import { describe, expect, it, vi } from "vitest";
import { markDocumentDirty } from "@/lib/copper/events";
import {
  confirmRestart,
  updateProgressPercent,
} from "@/lib/updates/restart-prompt";

describe("restart prompt", () => {
  it("warns when the editor is dirty and skips relaunch when cancelled", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    markDocumentDirty("vault", "note.md", true);
    expect(confirmRestart("0.1.1")).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      "You have unsaved changes. Restart and update to 0.1.1? Unsaved edits will be lost.",
    );
    confirm.mockRestore();
    markDocumentDirty("vault", "note.md", false);
  });

  it("asks to restart when the editor is clean", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(confirmRestart("0.1.1", false)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Restart and update to 0.1.1?");
    confirm.mockRestore();
  });

  it("computes download percent only when a total is known", () => {
    expect(updateProgressPercent(40, 100)).toBe(40);
    expect(updateProgressPercent(10, null)).toBeNull();
  });
});
