import { describe, expect, it } from "vitest";
import { camelizeKeys } from "@/lib/copper/invoke";

describe("camelizeKeys", () => {
  it("converts command argument names to camelCase", () => {
    expect(
      camelizeKeys({
        vault_id: "abc",
        source_path: "/tmp/img.png",
        attachment_folder: "attachments",
        path: "Inbox/note.md",
      }),
    ).toEqual({
      vaultId: "abc",
      sourcePath: "/tmp/img.png",
      attachmentFolder: "attachments",
      path: "Inbox/note.md",
    });
  });
});
