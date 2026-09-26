import { describe, expect, it } from "vitest";
import { fileName, fileStem } from "@/lib/paths";

describe("paths", () => {
  it("stems Markdown and source filenames", () => {
    expect(fileName("drafts/README.md")).toBe("README.md");
    expect(fileStem("drafts/README.md")).toBe("README");
    expect(fileStem("Projects/app.ts")).toBe("app");
  });
});
