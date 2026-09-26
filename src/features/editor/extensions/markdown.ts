import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

export function markdownLanguageSupport() {
  return markdown({ codeLanguages: languages });
}
