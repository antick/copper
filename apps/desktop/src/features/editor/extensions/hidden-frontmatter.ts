import { type EditorState, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { frontmatterEnd } from "@/features/editor/extensions/live-preview-decorations";

class HiddenFrontmatterWidget extends WidgetType {
  toDOM() {
    const el = document.createElement("div");
    el.className = "cm-copper-hidden-block";
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  eq() {
    return true;
  }

  get estimatedHeight() {
    return 0;
  }

  ignoreEvent() {
    return true;
  }
}

const hideFrontmatter = Decoration.replace({
  widget: new HiddenFrontmatterWidget(),
  block: true,
});

function build(state: EditorState): DecorationSet {
  const end = frontmatterEnd(state.doc);
  if (end < 0) {
    return Decoration.none;
  }
  const head = state.selection.main.head;
  if (head > 0 && head <= end) {
    return Decoration.none;
  }
  const to = Math.min(end + 1, state.doc.length);
  if (to <= 0) {
    return Decoration.none;
  }
  return Decoration.set([hideFrontmatter.range(0, to)]);
}

export const hiddenFrontmatter = StateField.define<DecorationSet>({
  create: build,
  update(value, tr) {
    return tr.docChanged || tr.selection ? build(tr.state) : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
