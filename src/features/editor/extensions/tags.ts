import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import {
  fenceBlocksOf,
  isPosInFence,
} from "@/features/editor/extensions/fence-blocks";

const TAG_RE = /(^|\s)(#[\p{L}\p{N}_/-]+)/gu;

export const tags = ViewPlugin.fromClass(
  class {
    decorations = Decoration.none;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = build(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

function build(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const fences = fenceBlocksOf(view.state);
  for (const range of view.visibleRanges) {
    const text = view.state.sliceDoc(range.from, range.to);
    TAG_RE.lastIndex = 0;
    for (const match of text.matchAll(TAG_RE)) {
      const tag = match[2] ?? "";
      const from = range.from + (match.index ?? 0) + (match[1]?.length ?? 0);
      if (isPosInFence(view.state.doc, from, fences)) {
        continue;
      }
      builder.add(
        from,
        from + tag.length,
        Decoration.mark({ class: "cm-copper-tag" }),
      );
    }
  }
  return builder.finish();
}
