import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

class CheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super();
  }
  eq(other: CheckboxWidget) {
    return this.checked === other.checked;
  }
  toDOM(view: EditorView) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.checked;
    input.className = "cm-copper-task";
    input.addEventListener("mousedown", (event) => event.preventDefault());
    input.addEventListener("click", (event) => {
      event.preventDefault();
      const pos = view.posAtDOM(input);
      const line = view.state.doc.lineAt(pos);
      const next = this.checked
        ? line.text.replace("[x]", "[ ]").replace("[X]", "[ ]")
        : line.text.replace("[ ]", "[x]");
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: next },
      });
    });
    return input;
  }
  ignoreEvent() {
    return false;
  }
}

export const tasks = ViewPlugin.fromClass(
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
  for (const visible of view.visibleRanges) {
    const start = view.state.doc.lineAt(visible.from).number;
    const end = view.state.doc.lineAt(
      Math.max(visible.from, visible.to - 1),
    ).number;
    for (let number = start; number <= end; number += 1) {
      const line = view.state.doc.line(number);
      const match = /^(?:\s*[-*]\s+)\[( |x|X)\]/.exec(line.text);
      if (!match) {
        continue;
      }
      const from = line.from + (match[0].length - 3);
      builder.add(
        from,
        from + 3,
        Decoration.replace({ widget: new CheckboxWidget(match[1] !== " ") }),
      );
    }
  }
  return builder.finish();
}
