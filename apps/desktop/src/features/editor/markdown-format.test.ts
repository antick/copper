import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyMarkdownFormat,
  type MarkdownFormat,
} from "@/features/editor/markdown-format";

const CASES: Array<[MarkdownFormat, string]> = [
  ["bold", "**hello**"],
  ["italic", "*hello*"],
  ["heading", "## hello"],
  ["link", "[hello](https://)"],
  ["list", "- hello"],
  ["task", "- [ ] hello"],
  ["quote", "> hello"],
  ["code", "`hello`"],
];

let view: EditorView | undefined;
afterEach(() => view?.destroy());

describe("Markdown formatting", () => {
  for (const [format, expected] of CASES) {
    it(`applies ${format} to the active CodeMirror selection`, () => {
      const parent = document.body.appendChild(document.createElement("div"));
      view = new EditorView({
        parent,
        state: EditorState.create({
          doc: "hello",
          selection: { anchor: 0, head: 5 },
        }),
      });
      applyMarkdownFormat(view, format);
      expect(view.state.doc.toString()).toBe(expected);
      expect(view.hasFocus).toBe(true);
    });
  }
});
