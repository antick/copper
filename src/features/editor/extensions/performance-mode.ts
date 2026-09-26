import { EditorState } from "@codemirror/state";

export const LARGE_DOC_BYTES = 1_000_000;
export const HUGE_DOC_BYTES = 5_000_000;

export function documentSize(state: EditorState) {
  return state.doc.length;
}

export function shouldDeferEmbeds(state: EditorState) {
  return documentSize(state) >= HUGE_DOC_BYTES;
}

export function shouldLimitDecorations(state: EditorState) {
  return documentSize(state) >= LARGE_DOC_BYTES;
}

export const performanceMode = EditorState.transactionFilter.of((tr) => tr);
