import { type Range, RangeSetBuilder } from "@codemirror/state";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import { Decoration, type DecorationSet, ViewPlugin } from "@codemirror/view";
import {
  fenceBlocksOf,
  isPosInFence,
} from "@/features/editor/extensions/fence-blocks";
import { ImageWidget } from "@/features/editor/image-widget";

const LOOKAHEAD = 2_000;
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const WIKI_RE = /\[\[([^\]]+)\]\]/g;

function buildViewportDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const docLength = view.state.doc.length;
  const fences = fenceBlocksOf(view.state);
  const visibleRanges =
    view.visibleRanges.length > 0
      ? view.visibleRanges
      : [{ from: 0, to: Math.min(docLength, 8_000) }];

  for (const visible of visibleRanges) {
    const from = Math.max(0, visible.from - LOOKAHEAD);
    const to = Math.min(docLength, visible.to + LOOKAHEAD);
    const text = view.state.sliceDoc(from, to);

    IMAGE_RE.lastIndex = 0;
    for (const match of text.matchAll(IMAGE_RE)) {
      const start = from + (match.index ?? 0);
      const end = start + match[0].length;
      if (isPosInFence(view.state.doc, start, fences)) {
        continue;
      }
      ranges.push(
        Decoration.widget({
          widget: new ImageWidget(match[2] ?? "", match[1] ?? ""),
          side: 1,
        }).range(end),
      );
    }

    WIKI_RE.lastIndex = 0;
    for (const match of text.matchAll(WIKI_RE)) {
      const start = from + (match.index ?? 0);
      const end = start + match[0].length;
      if (isPosInFence(view.state.doc, start, fences)) {
        continue;
      }
      ranges.push(
        Decoration.mark({ class: "cm-copper-wiki" }).range(start, end),
      );
    }
  }

  ranges.sort(
    (a, b) => a.from - b.from || a.value.startSide - b.value.startSide,
  );
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of ranges) {
    builder.add(range.from, range.to, range.value);
  }
  return builder.finish();
}

export const viewportWidgets = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildViewportDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildViewportDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);
