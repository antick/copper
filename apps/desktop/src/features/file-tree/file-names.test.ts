import { expect, it } from "vitest";
import { childPath, renamedPath } from "./file-names";

it("keeps a renamed file in its parent folder and preserves title extensions", () => {
  expect(renamedPath("folder/note.md", "Research.v1", { title: true })).toBe(
    "folder/Research.v1.md",
  );
  expect(renamedPath("folder/note.md", "Research.md", { title: true })).toBe(
    "folder/Research.md",
  );
  expect(renamedPath("folder/note.markdown", "Research")).toBe(
    "folder/Research.markdown",
  );
  expect(renamedPath("folder/old", "new", { directory: true })).toBe(
    "folder/new",
  );
  expect(childPath("folder", " research ")).toBe("folder/research");
});

it.each([
  "",
  " ",
  ".",
  "..",
  "../escape",
  "other/name",
  "other\\name",
  "bad\0name",
])("rejects invalid names before renaming: %j", (name) => {
  expect(() => renamedPath("folder/note.md", name, { title: true })).toThrow();
  expect(() => childPath("folder", name)).toThrow();
});
