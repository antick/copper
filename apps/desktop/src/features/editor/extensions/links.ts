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

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export const links = ViewPlugin.fromClass(
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
    LINK_RE.lastIndex = 0;
    for (const match of text.matchAll(LINK_RE)) {
      const from = range.from + (match.index ?? 0);
      if (isPosInFence(view.state.doc, from, fences)) {
        continue;
      }
      builder.add(
        from,
        from + match[0].length,
        Decoration.mark({ class: "cm-copper-link" }),
      );
    }
  }
  return builder.finish();
}
