import { EditorView } from "@codemirror/view";

export const copperEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "var(--editor-font-size, 15px)",
    backgroundColor: "var(--editor-bg, #ffffff)",
    color: "var(--text-primary, #18181b)",
  },
  ".cm-scroller": {
    fontFamily:
      'var(--font-ui, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    lineHeight: "var(--editor-line-height, 1.65)",
  },
  ".cm-content": {
    caretColor: "var(--accent, #2563eb)",
    maxWidth: "720px",
    margin: "0 auto",
    padding: "var(--editor-content-pad-top, 12px) clamp(28px, 7%, 48px) 96px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--editor-bg, #ffffff)",
    color: "var(--text-tertiary, #a1a1aa)",
    borderRight: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--selection, rgba(37, 99, 235, 0.18))",
  },
  ".cm-copper-image": {
    display: "block",
    maxWidth: "100%",
    maxHeight: "240px",
    margin: "10px 0 14px",
    borderRadius: "8px",
  },
  ".cm-copper-code-line": {
    backgroundColor: "var(--code-block-bg, #f3f1eb)",
    fontFamily:
      'var(--font-mono, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)',
    fontSize: "var(--code-block-font-size, 13px)",
    lineHeight: "var(--code-block-line-height, 1.5)",
    letterSpacing: "normal",
    padding: "2px var(--code-block-pad-x, 14px)",
  },
  ".cm-copper-code-line *": {
    fontFamily: "inherit",
    letterSpacing: "inherit",
  },
  ".cm-copper-code-first": {
    borderTop: "var(--code-block-gap, 8px) solid var(--editor-bg, #fffdf9)",
    paddingTop: "var(--code-block-pad-y, 10px)",
    borderTopLeftRadius: "var(--radius-sm, 6px)",
    borderTopRightRadius: "var(--radius-sm, 6px)",
  },
  ".cm-copper-code-last": {
    borderBottom: "var(--code-block-gap, 8px) solid var(--editor-bg, #fffdf9)",
    paddingBottom: "var(--code-block-pad-y, 10px)",
    borderBottomLeftRadius: "var(--radius-sm, 6px)",
    borderBottomRightRadius: "var(--radius-sm, 6px)",
  },
  ".cm-copper-code-meta": {
    color: "var(--text-tertiary, #6f675e)",
    fontSize: "11px",
  },
  ".cm-copper-wiki": {
    color: "var(--accent, #2563eb)",
    textDecoration: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
  },
  ".cm-copper-tag": {
    color: "var(--accent, #2563eb)",
  },
  ".cm-copper-link": {
    color: "var(--syntax-link, #2563eb)",
    textDecoration: "underline",
  },
  ".cm-copper-hidden-mark": {
    display: "inline",
    width: 0,
    overflow: "hidden",
  },
  ".cm-copper-h1": {
    fontSize: "2.05em",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1.25,
  },
  ".cm-copper-h2": {
    fontSize: "1.28em",
    fontWeight: 650,
    letterSpacing: "-0.02em",
  },
  ".cm-copper-h1 span, .cm-copper-h2 span, .cm-copper-h3 span": {
    textDecoration: "none",
  },
  ".cm-copper-h3": { fontSize: "1.1em", fontWeight: 600 },
  ".cm-copper-task": {
    marginRight: "8px",
  },
});
