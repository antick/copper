import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  findFenceBlocks,
  lineFenceRole,
} from "@/features/editor/extensions/fence-blocks";

function doc(text: string) {
  return EditorState.create({ doc: text }).doc;
}

describe("fence block scanning", () => {
  it("finds a backtick fence with a language tag", () => {
    const blocks = findFenceBlocks(
      doc("intro\n```sh\naws configure list-profiles\n```\nafter\n"),
    );
    expect(blocks).toEqual([{ openLine: 2, closeLine: 4 }]);
    expect(lineFenceRole(blocks, 2, 5)).toBe("open");
    expect(lineFenceRole(blocks, 3, 5)).toBe("content");
    expect(lineFenceRole(blocks, 4, 5)).toBe("close");
    expect(lineFenceRole(blocks, 1, 5)).toBeNull();
  });

  it("does not treat an inner language fence as a closer", () => {
    const blocks = findFenceBlocks(doc("```sh\necho ```ts\n```\n"));
    expect(blocks).toEqual([{ openLine: 1, closeLine: 3 }]);
  });

  it("keeps an unclosed fence open through the document end", () => {
    const text = "```js\nconst n = 1;\nstill code\n";
    const blocks = findFenceBlocks(doc(text));
    expect(blocks).toEqual([{ openLine: 1, closeLine: null }]);
    expect(lineFenceRole(blocks, 3, 3)).toBe("content");
  });
});
