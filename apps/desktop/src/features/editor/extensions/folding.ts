import { foldGutter, foldKeymap } from "@codemirror/language";
import { keymap } from "@codemirror/view";

export function folding(showGutter = true) {
  return [showGutter ? foldGutter() : [], keymap.of(foldKeymap)];
}
