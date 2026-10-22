import { describe, expect, it } from "vitest";
import { validateAttachmentFolder } from "./attachment-folder";

describe("attachment folder validation", () => {
  it.each([
    ["/images", "absolute paths"],
    ["../images", "parent traversal"],
    ["images/../outside", "nested parent traversal"],
    ["C:\\images", "Windows absolute paths"],
  ])("rejects %s (%s)", (folder) => {
    const result = validateAttachmentFolder(folder);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toBeTruthy();
  });

  it("keeps nested folder names with spaces and normalizes separators", () => {
    expect(validateAttachmentFolder("Notes and Images\\Raw Uploads")).toEqual({
      valid: true,
      folder: "Notes and Images/Raw Uploads",
    });
  });

  it.each([
    "COM¹",
    "COM²",
    "COM³",
    "LPT¹",
    "LPT²",
    "LPT³",
    "images/com¹.png",
    "images/lpt³.backup",
  ])("rejects the Windows-reserved device name %s", (folder) => {
    expect(validateAttachmentFolder(folder).valid).toBe(false);
  });

  it.each(["COM0", "COM10", "COM⁴", "LPT10", "COM¹-images"])(
    "accepts the ordinary folder name %s",
    (folder) => {
      expect(validateAttachmentFolder(folder)).toEqual({ valid: true, folder });
    },
  );
});
