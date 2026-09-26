import type { EditorView, KeyBinding } from "@codemirror/view";

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "heading"
  | "link"
  | "list"
  | "task"
  | "quote"
  | "code";

function replaceSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholder: string,
) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to) || placeholder;
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selected.length,
    },
    scrollIntoView: true,
  });
}

function prefixLines(view: EditorView, prefix: string, placeholder: string) {
  const selection = view.state.selection.main;
  const first = view.state.doc.lineAt(selection.from);
  const last = view.state.doc.lineAt(
    selection.to > selection.from ? selection.to - 1 : selection.to,
  );
  const source = view.state.doc.sliceString(first.from, last.to);
  const inserted = (source || placeholder)
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  view.dispatch({
    changes: { from: first.from, to: last.to, insert: inserted },
    selection: {
      anchor: first.from + prefix.length,
      head: first.from + inserted.length,
    },
    scrollIntoView: true,
  });
}

export function applyMarkdownFormat(view: EditorView, format: MarkdownFormat) {
  const selection = view.state.selection.main;
  const selected = view.state.doc.sliceString(selection.from, selection.to);
  if (format === "heading") prefixLines(view, "## ", "Heading");
  else if (format === "list") prefixLines(view, "- ", "List item");
  else if (format === "task") prefixLines(view, "- [ ] ", "Task");
  else if (format === "quote") prefixLines(view, "> ", "Quote");
  else if (format === "bold") replaceSelection(view, "**", "**", "bold text");
  else if (format === "italic") replaceSelection(view, "*", "*", "italic text");
  else if (format === "link") {
    replaceSelection(view, "[", "](https://)", "link text");
  } else if (format === "code" && selected.includes("\n")) {
    replaceSelection(view, "```\n", "\n```", "code");
  } else {
    replaceSelection(view, "`", "`", "code");
  }
  view.focus();
  return true;
}

export const markdownFormattingKeymap: KeyBinding[] = [
  { key: "Mod-b", run: (view) => applyMarkdownFormat(view, "bold") },
  { key: "Mod-i", run: (view) => applyMarkdownFormat(view, "italic") },
  { key: "Mod-k", run: (view) => applyMarkdownFormat(view, "link") },
];
