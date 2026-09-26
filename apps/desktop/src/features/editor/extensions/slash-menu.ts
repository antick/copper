import {
  autocompletion,
  type CompletionContext,
} from "@codemirror/autocomplete";

const SLASH_ITEMS = [
  { label: "Heading 1", apply: "# " },
  { label: "Heading 2", apply: "## " },
  { label: "Heading 3", apply: "### " },
  { label: "Bullet list", apply: "- " },
  { label: "Numbered list", apply: "1. " },
  { label: "Task", apply: "- [ ] " },
  { label: "Quote", apply: "> " },
  { label: "Code block", apply: "```\n\n```" },
  { label: "Divider", apply: "---\n" },
  {
    label: "Table",
    apply: "| Column | Column |\n| --- | --- |\n|  |  |\n",
  },
] as const;

export function slashCompletions(context: CompletionContext) {
  const match = context.matchBefore(/(^|\s)\/[^\s]*/);
  if (!match) {
    return null;
  }
  const slash = match.text.lastIndexOf("/");
  const from = match.from + slash;
  const query = match.text.slice(slash + 1).toLowerCase();
  const options = SLASH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query),
  ).map((item) => ({
    label: item.label,
    apply: item.apply,
    type: "keyword" as const,
  }));
  if (options.length === 0) {
    return null;
  }
  return { from, options, filter: false };
}

export function slashMenu() {
  return autocompletion({
    override: [slashCompletions],
    activateOnTyping: true,
    icons: false,
  });
}
