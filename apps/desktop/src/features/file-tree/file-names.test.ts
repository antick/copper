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
  ["folder/Note.MD", "Research.md", "folder/Research.md"],
  ["folder/Note.md", "Research.MD", "folder/Research.MD"],
  ["folder/Note.Markdown", "Research.MARKDOWN", "folder/Research.MARKDOWN"],
  ["folder/Note.MD", "Research.v1", "folder/Research.v1.MD"],
])(
  "preserves a single extension when renaming %s to %s",
  (current, requested, expected) => {
    expect(renamedPath(current, requested, { title: true })).toBe(expected);
  },
);

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
