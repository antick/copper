import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import {
  fenceBlocksOf,
  lineFenceRole,
} from "@/features/editor/extensions/fence-blocks";

export const headings = ViewPlugin.fromClass(
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
  for (const visible of view.visibleRanges) {
    const start = view.state.doc.lineAt(visible.from).number;
    const end = view.state.doc.lineAt(
      Math.max(visible.from, visible.to - 1),
    ).number;
    for (let number = start; number <= end; number += 1) {
      if (lineFenceRole(fences, number, view.state.doc.lines)) {
        continue;
      }
      const line = view.state.doc.line(number);
      const match = /^(#{1,6})\s/.exec(line.text);
      if (match) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({ class: `cm-copper-h${match[1].length}` }),
        );
      }
    }
  }
  return builder.finish();
}
