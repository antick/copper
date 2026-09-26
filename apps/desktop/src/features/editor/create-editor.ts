import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  placeholder as editorPlaceholder,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { copperEditorTheme } from "@/features/editor/editor-theme";
import { dropFiles } from "@/features/editor/extensions/drop-files";
import { fenceBlocksField } from "@/features/editor/extensions/fence-blocks";
import { folding } from "@/features/editor/extensions/folding";
import { images } from "@/features/editor/extensions/images";
import { links } from "@/features/editor/extensions/links";
import { livePreview } from "@/features/editor/extensions/live-preview";
import { markdownLanguageSupport } from "@/features/editor/extensions/markdown";
import { performanceMode } from "@/features/editor/extensions/performance-mode";
import { searchReplace } from "@/features/editor/extensions/search";
import { slashMenu } from "@/features/editor/extensions/slash-menu";
import { tags } from "@/features/editor/extensions/tags";
import { wikiLinks } from "@/features/editor/extensions/wiki-links";
import { localImageLoader } from "@/features/editor/image-widget";
import { markdownFormattingKeymap } from "@/features/editor/markdown-format";

export interface CreateCopperEditorOptions {
  parent: HTMLElement;
  doc: string;
  path?: string;
  mode?: "markdown" | "source";
  onDocChanged?: (contents: string) => void;
  loadImage?: (path: string) => Promise<string>;
  onDropPaths?: (paths: string[]) => void;
  livePreviewEnabled?: boolean;
  wrapping?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}

export function createCopperEditor({
  parent,
  doc,
  path,
  mode = "markdown",
  onDocChanged,
  onDropPaths,
  loadImage,
  livePreviewEnabled = true,
  wrapping = true,
  ariaLabel,
  placeholder,
}: CreateCopperEditorOptions): EditorView {
  const markdown = mode === "markdown";
  const language = new Compartment();
  const state = EditorState.create({
    doc,
    extensions: [
      markdown && livePreviewEnabled
        ? []
        : [lineNumbers(), highlightActiveLineGutter()],
      highlightActiveLine(),
      history(),
      drawSelection(),
      rectangularSelection(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      language.of(markdown ? markdownLanguageSupport() : []),
      copperEditorTheme,
      EditorView.contentAttributes.of({
        "aria-label":
          ariaLabel ?? (markdown ? "Markdown editor" : "Source editor"),
      }),
      placeholder ? editorPlaceholder(placeholder) : [],
      markdown ? fenceBlocksField : [],
      markdown ? images : [],
      loadImage ? localImageLoader.of(loadImage) : [],
      markdown ? wikiLinks : [],
      markdown ? tags : [],
      markdown && livePreviewEnabled ? livePreview() : [],
      markdown && livePreviewEnabled ? slashMenu() : [],
      markdown ? links : [],
      markdown ? folding(!livePreviewEnabled) : [],
      searchReplace(),
      performanceMode,
      markdown && onDropPaths ? dropFiles(onDropPaths) : [],
      keymap.of([
        ...(markdown ? markdownFormattingKeymap : []),
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      wrapping ? EditorView.lineWrapping : [],
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onDocChanged?.(update.state.doc.toString());
        }
      }),
    ],
  });

  const view = new EditorView({ state, parent });
  if (!markdown && path) {
    void loadSourceLanguage(path).then((support) => {
      if (support && view.dom.isConnected) {
        // Reconfiguring syntax support does not change the document and must
        // never make a newly opened file eligible for autosave.
        view.dispatch({ effects: language.reconfigure(support) });
      }
    });
  }
  return view;
}

async function loadSourceLanguage(path: string) {
  const fileName = path.split("/").at(-1) ?? path;
  const extension = fileName.includes(".")
    ? (fileName.split(".").at(-1)?.toLowerCase() ?? "")
    : "";
  const description = languages.find(
    (candidate) =>
      candidate.extensions.includes(extension) ||
      candidate.filename?.test(fileName),
  );
  return description?.load();
}
