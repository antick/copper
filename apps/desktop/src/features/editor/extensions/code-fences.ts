import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import {
  type FenceBlock,
  fenceBlocksOf,
  lineFenceRole,
} from "@/features/editor/extensions/fence-blocks";

function blockAt(blocks: FenceBlock[], line: number, docLines: number) {
  return (
    blocks.find((block) => {
      const end = block.closeLine ?? docLines;
      return line >= block.openLine && line <= end;
    }) ?? null
  );
}

function build(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const blocks = fenceBlocksOf(view.state);
  if (blocks.length === 0) {
    return Decoration.none;
  }
  const cursorLine = doc.lineAt(view.state.selection.main.head).number;
  for (const visible of view.visibleRanges) {
    const start = doc.lineAt(visible.from).number;
    const end = doc.lineAt(Math.max(visible.from, visible.to - 1)).number;
    for (let number = start; number <= end; number += 1) {
      const role = lineFenceRole(blocks, number, doc.lines);
      if (!role) {
        continue;
      }
      const block = blockAt(blocks, number, doc.lines);
      if (!block) {
        continue;
      }
      const line = doc.line(number);
      const blockEnd = block.closeLine ?? doc.lines;
      const active = cursorLine >= block.openLine && cursorLine <= blockEnd;
      const classes = ["cm-copper-code-line"];
      if (number === block.openLine) {
        classes.push("cm-copper-code-first");
      }
      if (number === blockEnd) {
        classes.push("cm-copper-code-last");
      }
      if ((role === "open" || role === "close") && !active) {
        classes.push("cm-copper-code-meta");
      }
      builder.add(
        line.from,
        line.from,
        Decoration.line({ class: classes.join(" ") }),
      );
    }
  }
  return builder.finish();
}

export const codeFences = ViewPlugin.fromClass(
  class {
    decorations = Decoration.none;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged
      ) {
        this.decorations = build(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);
