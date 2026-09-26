import { search, searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";

export function searchReplace() {
  return [search(), keymap.of(searchKeymap)];
}
