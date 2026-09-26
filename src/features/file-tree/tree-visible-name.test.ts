import { describe, expect, it } from "vitest";
import { treeVisibleName } from "@/features/file-tree/tree-visible-name";

describe("treeVisibleName", () => {
  it("strips the final extension when a type badge is present", () => {
    expect(treeVisibleName("ai.md", "file", "MD")).toBe("ai");
    expect(treeVisibleName("app.ts", "file", "TS")).toBe("app");
    expect(treeVisibleName("config.json", "file", "JSON")).toBe("config");
    expect(treeVisibleName("README.md.md", "file", "MD")).toBe("README.md");
  });

  it("keeps folders, extensionless names, and names without a badge", () => {
    expect(treeVisibleName("code", "directory")).toBe("code");
    expect(treeVisibleName("README", "file", "TXT")).toBe("README");
    expect(treeVisibleName(".env", "file", "TXT")).toBe(".env");
    expect(treeVisibleName("notes.md", "file")).toBe("notes.md");
  });
});
