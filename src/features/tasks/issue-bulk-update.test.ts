import { describe, expect, it, vi } from "vitest";
import { updateIssuesWithFailures } from "@/features/tasks/issue-bulk-update";

describe("updateIssuesWithFailures", () => {
  it("returns only failed issue ids and still attempts every update", async () => {
    const update = vi.fn(async (id: string) => {
      if (id === "COPP-2") throw new Error("write failed");
    });
    await expect(
      updateIssuesWithFailures(
        ["COPP-1", "COPP-2", "COPP-3"],
        { status: "done" },
        update,
      ),
    ).resolves.toEqual(["COPP-2"]);
    expect(update).toHaveBeenCalledTimes(3);
  });
});
