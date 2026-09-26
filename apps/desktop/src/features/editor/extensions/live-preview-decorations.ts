import { RangeSetBuilder, type Text } from "@codemirror/state";
import {
  Decoration,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import {
  fenceBlocksOf,
  lineFenceRole,
} from "@/features/editor/extensions/fence-blocks";
import { shouldLimitDecorations } from "@/features/editor/extensions/performance-mode";

const MARKER_RE = /(\*\*|__|\*|_|~~|`)/g;
const HEADING_MARK_RE = /^(#{1,6})\s/;

class HiddenMarkWidget extends WidgetType {
  toDOM() {
    const mark = document.createElement("span");
    mark.className = "cm-copper-hidden-mark";
    mark.setAttribute("aria-hidden", "true");
    return mark;
  }

  eq() {
    return true;
  }

  ignoreEvent() {
    return true;
  }
}

const hideMark = Decoration.replace({ widget: new HiddenMarkWidget() });

export const livePreviewDecorations = ViewPlugin.fromClass(
  class {
    decorations = Decoration.none;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.focusChanged
      ) {
        this.decorations = build(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

export function frontmatterEnd(doc: Text): number {
  if (doc.lines < 3) {
    return -1;
  }
  if (doc.line(1).text.trim() !== "---") {
    return -1;
  }
  for (let number = 2; number <= Math.min(doc.lines, 80); number += 1) {
    if (doc.line(number).text.trim() === "---") {
      return doc.line(number).to;
    }
  }
  return -1;
}

function build(view: EditorView) {
  if (shouldLimitDecorations(view.state)) {
    return Decoration.none;
  }
  const builder = new RangeSetBuilder<Decoration>();
  const cursor = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(cursor).number;
  const fmEnd = frontmatterEnd(view.state.doc);
  const fences = fenceBlocksOf(view.state);
  const hideFrontmatter = fmEnd >= 0 && cursor > fmEnd;

  for (const visible of view.visibleRanges) {
    const start = view.state.doc.lineAt(visible.from).number;
    const end = view.state.doc.lineAt(
      Math.max(visible.from, visible.to - 1),
    ).number;
    for (let number = start; number <= end; number += 1) {
      const line = view.state.doc.line(number);
      if (hideFrontmatter && line.from < fmEnd) {
        continue;
      }
      const role = lineFenceRole(fences, number, view.state.doc.lines);
      if (role === "content") {
        continue;
      }
      if (role === "open" || role === "close") {
        const inActiveFence = fences.some((block) => {
          const blockEnd = block.closeLine ?? view.state.doc.lines;
          return (
            cursorLine >= block.openLine &&
            cursorLine <= blockEnd &&
            number >= block.openLine &&
            number <= blockEnd
          );
        });
        if (inActiveFence) {
          continue;
        }
      }
      if (view.hasFocus && number === cursorLine) {
        continue;
      }
      const heading = HEADING_MARK_RE.exec(line.text);
      if (heading) {
        builder.add(line.from, line.from + heading[1].length + 1, hideMark);
      }
      MARKER_RE.lastIndex = 0;
      for (const match of line.text.matchAll(MARKER_RE)) {
        const from = line.from + (match.index ?? 0);
        const to = from + match[0].length;
        if (heading && from < line.from + heading[1].length + 1) {
          continue;
        }
        builder.add(from, to, hideMark);
      }
    }
  }
  return builder.finish();
}
