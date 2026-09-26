import { describe, expect, it } from "vitest";
import type { FileTreeNode } from "@/features/file-tree/types";
import {
  collectMarkdownNotes,
  favoriteHits,
  mergeIndexedNotes,
  notesInScope,
} from "@/features/search/notes-from-tree";

const tree: FileTreeNode = {
  name: "vault",
  path: "",
  kind: "directory",
  children: [
    {
      name: "Inbox",
      path: "Inbox",
      kind: "directory",
      children: [
        {
          name: "quick.md",
          path: "Inbox/quick.md",
          kind: "file",
        },
      ],
    },
    {
      name: "app.ts",
      path: "app.ts",
      kind: "file",
      fileKind: "code",
      typeLabel: "TS",
    },
    {
      name: "dsa",
      path: "dsa",
      kind: "directory",
      children: [
        {
          name: "Big O Notation",
          path: "dsa/Big O Notation",
          kind: "directory",
          children: [
            {
              name: "README.md",
              path: "dsa/Big O Notation/README.md",
              kind: "file",
            },
          ],
        },
      ],
    },
  ],
};

describe("notes from the file tree", () => {
  it("lists markdown files by folder even when the search index is empty", () => {
    const all = collectMarkdownNotes(tree);
    expect(all.map((note) => note.path)).toEqual([
      "Inbox/quick.md",
      "dsa/Big O Notation/README.md",
    ]);
    expect(notesInScope(all, "all")).toHaveLength(2);
    expect(notesInScope(all, "Inbox").map((note) => note.path)).toEqual([
      "Inbox/quick.md",
    ]);
    expect(
      notesInScope(all, "dsa/Big O Notation").map((note) => note.path),
    ).toEqual(["dsa/Big O Notation/README.md"]);
    expect(mergeIndexedNotes(all, [])).toEqual(all);
    expect(
      mergeIndexedNotes(all, [
        {
          path: "Inbox/indexed-before-tree-refresh.md",
          title: "Freshly indexed",
          snippet: "",
          tags: [],
          mtimeNs: 1,
        },
      ]).map((note) => note.path),
    ).toContain("Inbox/indexed-before-tree-refresh.md");
  });

  it("filters both sources by a normalized scope before merging", () => {
    const indexedOnlyInScope = {
      path: "dsa/Big O Notation/indexed.md",
      title: "Indexed only",
      snippet: "",
      tags: [],
      mtimeNs: 2,
    };
    const indexedOutsideScope = {
      path: "Inbox/outside.md",
      title: "Outside",
      snippet: "",
      tags: [],
      mtimeNs: 3,
    };

    expect(
      mergeIndexedNotes(
        collectMarkdownNotes(tree),
        [indexedOnlyInScope, indexedOutsideScope],
        " ./dsa\\Big O Notation/ ",
      ).map((note) => note.path),
    ).toEqual([
      "dsa/Big O Notation/README.md",
      "dsa/Big O Notation/indexed.md",
    ]);
  });

  it("excludes Archive from ordinary scopes and favorites", () => {
    const notes = [
      {
        path: "ordinary.md",
        title: "Ordinary",
        snippet: "",
        tags: [],
        mtimeNs: 0,
      },
      {
        path: "Archive/Projects/old.md",
        title: "Old",
        snippet: "",
        tags: [],
        mtimeNs: 0,
      },
    ];
    expect(notesInScope(notes, "all").map((note) => note.path)).toEqual([
      "ordinary.md",
    ]);
    expect(notesInScope(notes, "Archive").map((note) => note.path)).toEqual([
      "Archive/Projects/old.md",
    ]);
    expect(favoriteHits(["Archive/Projects/old.md"], notes)).toEqual([]);
  });

  it("keeps starred paths even if they are missing from the current note list", () => {
    const hits = favoriteHits(
      ["missing.md", "Inbox/quick.md"],
      [
        {
          path: "Inbox/quick.md",
          title: "quick",
          snippet: "",
          tags: [],
          mtimeNs: 0,
        },
      ],
    );
    expect(hits.map((note) => note.path)).toEqual([
      "missing.md",
      "Inbox/quick.md",
    ]);
  });
});
