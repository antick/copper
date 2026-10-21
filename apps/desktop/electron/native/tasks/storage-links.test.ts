import { expect, it } from "vitest";
import { rewriteTaskLinks } from "./storage-links";

const moves = [
  {
    from: "Tasks/Issues/ISSUE-1-note.md",
    to: ".copper/tasks/issues/ISSUE-1-note.md",
  },
];
it("preserves Vault-relative attachments and rebases explicit relative links in moved sources", () => {
  const source =
    "![image](attachments/picture.png)\n[relative](../../Notes.md)\n";
  const next = rewriteTaskLinks(source, moves[0].from, moves[0].to, moves);
  expect(next).toContain("![image](attachments/picture.png)");
  expect(next).toContain("[relative](../../../Notes.md)");
});

it("updates Markdown references and wiki links, keeping code and metadata intact", () => {
  const source =
    "---\nexample: Tasks/Issues/ISSUE-1-note.md\n---\n\n[read]: Tasks/Issues/ISSUE-1-note.md\n\n[[Tasks/Issues/ISSUE-1-note#Heading|label]]\n\n```md\n[example](Tasks/Issues/ISSUE-1-note.md)\n```\n";
  const next = rewriteTaskLinks(source, "Notes.md", "Notes.md", moves);
  expect(next).toContain("example: Tasks/Issues/ISSUE-1-note.md");
  expect(next).toContain("[read]: .copper/tasks/issues/ISSUE-1-note.md");
  expect(next).toContain("[[.copper/tasks/issues/ISSUE-1-note#Heading|label]]");
  expect(next).toContain("```md\n[example](Tasks/Issues/ISSUE-1-note.md)\n```");
});
