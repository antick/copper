import { describe, expect, it, vi } from "vitest";
import {
  confirmRestart,
  updateProgressPercent,
} from "@/lib/updates/restart-prompt";

describe("restart prompt", () => {
  it("confirms the save and restart before installing an update", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(confirmRestart("0.1.1")).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      "Save open documents and restart Copper to update to 0.1.1?",
    );
    confirm.mockRestore();
  });

  it("computes download percent only when a total is known", () => {
    expect(updateProgressPercent(40, 100)).toBe(40);
    expect(updateProgressPercent(10, null)).toBeNull();
  });
});
