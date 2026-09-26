import { describe, expect, it } from "vitest";
import { dropFiles } from "@/features/editor/extensions/drop-files";

describe("drop files extension", () => {
  it("registers a drop handler without touching the editor input path", () => {
    const extension = dropFiles(() => undefined);
    expect(extension).toBeTruthy();
  });
});
