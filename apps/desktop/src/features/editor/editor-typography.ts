import { Compartment } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";

const TYPOGRAPHY_PROPERTIES = [
  "--editor-font-family",
  "--editor-font-size",
  "--editor-line-height",
];
const signature = () =>
  TYPOGRAPHY_PROPERTIES.map((name) =>
    document.documentElement.style.getPropertyValue(name),
  ).join(";");

function typographyTheme() {
  return EditorView.theme({
    "&": { fontSize: "var(--editor-font-size, 15px)" },
    ".cm-scroller": {
      fontFamily: "var(--editor-font-family, var(--font-ui))",
      lineHeight: "var(--editor-line-height, 1.65)",
    },
  });
}

export function editorTypography() {
  const appearance = new Compartment();
  return [
    appearance.of(typographyTheme()),
    ViewPlugin.define((view) => {
      let current = signature();
      // A new theme tells CodeMirror to discard cached font/row measurements.
      // requestMeasure alone retains those metrics when only CSS vars change.
      const refresh = () =>
        view.dispatch({ effects: appearance.reconfigure(typographyTheme()) });
      const observer = new MutationObserver(() => {
        const next = signature();
        if (next !== current) {
          current = next;
          refresh();
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style"],
      });
      document.fonts?.addEventListener("loadingdone", refresh);
      return {
        destroy() {
          observer.disconnect();
          document.fonts?.removeEventListener("loadingdone", refresh);
        },
      };
    }),
  ];
}
