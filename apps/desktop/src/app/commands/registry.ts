export type CommandId =
  | "new-note"
  | "open-vault"
  | "quick-open"
  | "global-search"
  | "command-palette"
  | "save"
  | "close-tab"
  | "next-tab"
  | "previous-tab"
  | "toggle-left-sidebar"
  | "toggle-right-sidebar"
  | "toggle-live-preview"
  | "rename-file"
  | "search-in-file"
  | "settings"
  | "publish-vault-git"
  | "toggle-tasks"
  | "new-issue"
  | "new-project"
  | "set-issue-status"
  | "set-issue-priority"
  | "set-issue-labels"
  | "next-issue"
  | "previous-issue"
  | "toggle-tasks-view";

export interface CommandDefinition {
  id: CommandId;
  label: string;
  shortcut: { mac: string; default: string };
}

export const commandDefinitions: CommandDefinition[] = [
  {
    id: "new-note",
    label: "New note",
    shortcut: { mac: "⌘N", default: "Ctrl+N" },
  },
  {
    id: "open-vault",
    label: "Open Vault",
    shortcut: { mac: "⌘O", default: "Ctrl+O" },
  },
  {
    id: "quick-open",
    label: "Quick open",
    shortcut: { mac: "⌘P", default: "Ctrl+P" },
  },
  {
    id: "global-search",
    label: "Search Vault",
    shortcut: { mac: "⇧⌘F", default: "Ctrl+Shift+F" },
  },
  {
    id: "command-palette",
    label: "Command palette",
    shortcut: { mac: "⌘K", default: "Ctrl+K" },
  },
  { id: "save", label: "Save", shortcut: { mac: "⌘S", default: "Ctrl+S" } },
  {
    id: "close-tab",
    label: "Close tab",
    shortcut: { mac: "⌘W", default: "Ctrl+W" },
  },
  {
    id: "next-tab",
    label: "Next tab",
    shortcut: { mac: "⇧⌘]", default: "Ctrl+Tab" },
  },
  {
    id: "previous-tab",
    label: "Previous tab",
    shortcut: { mac: "⇧⌘[", default: "Ctrl+Shift+Tab" },
  },
  {
    id: "toggle-left-sidebar",
    label: "Toggle left sidebar",
    shortcut: { mac: "⌘B", default: "Ctrl+B" },
  },
  {
    id: "toggle-right-sidebar",
    label: "Toggle right sidebar",
    shortcut: { mac: "⇧⌘B", default: "Ctrl+Shift+B" },
  },
  {
    id: "toggle-live-preview",
    label: "Toggle Live Preview",
    shortcut: { mac: "⌘/", default: "Ctrl+/" },
  },
  {
    id: "rename-file",
    label: "Rename file",
    shortcut: { mac: "F2", default: "F2" },
  },
  {
    id: "search-in-file",
    label: "Search in file",
    shortcut: { mac: "⌘F", default: "Ctrl+F" },
  },
  {
    id: "settings",
    label: "Settings",
    shortcut: { mac: "⌘,", default: "Ctrl+," },
  },
  {
    id: "publish-vault-git",
    label: "Push vault to GitHub",
    shortcut: { mac: "", default: "" },
  },
  {
    id: "toggle-tasks",
    label: "Switch to Tasks",
    shortcut: { mac: "⇧⌘T", default: "Ctrl+Shift+T" },
  },
  {
    id: "new-issue",
    label: "New issue",
    shortcut: { mac: "C", default: "C" },
  },
  {
    id: "new-project",
    label: "New project",
    shortcut: { mac: "", default: "" },
  },
  {
    id: "set-issue-status",
    label: "Set issue status",
    shortcut: { mac: "S", default: "S" },
  },
  {
    id: "set-issue-priority",
    label: "Set issue priority",
    shortcut: { mac: "P", default: "P" },
  },
  {
    id: "set-issue-labels",
    label: "Set issue labels",
    shortcut: { mac: "L", default: "L" },
  },
  {
    id: "next-issue",
    label: "Next issue",
    shortcut: { mac: "J", default: "J" },
  },
  {
    id: "previous-issue",
    label: "Previous issue",
    shortcut: { mac: "K", default: "K" },
  },
  {
    id: "toggle-tasks-view",
    label: "Toggle issue list and board",
    shortcut: { mac: "", default: "" },
  },
];

const handlers = new Map<CommandId, () => void>();

export function registerCommand(id: CommandId, handler: () => void) {
  handlers.set(id, handler);
  return () => {
    handlers.delete(id);
  };
}

export function runCommand(id: CommandId) {
  handlers.get(id)?.();
}

export function shortcutLabel(
  definition: CommandDefinition,
  platform?: string,
) {
  return platform === "macos"
    ? definition.shortcut.mac
    : definition.shortcut.default;
}

export function commandFromKeyboard(
  event: KeyboardEvent,
): CommandId | undefined {
  const key = event.key.toLowerCase();
  const mod = event.metaKey || event.ctrlKey;
  if (key === "f2") {
    return "rename-file";
  }
  if (!mod) {
    return undefined;
  }
  if (key === "n") return "new-note";
  if (key === "o") return "open-vault";
  if (key === "p" && !event.shiftKey) return "quick-open";
  if (key === "k") return "command-palette";
  if (key === "f" && event.shiftKey) return "global-search";
  if (key === "s") return "save";
  if (key === "w") return "close-tab";
  if (key === "b" && event.shiftKey) return "toggle-right-sidebar";
  if (key === "b") return "toggle-left-sidebar";
  if (key === "/") return "toggle-live-preview";
  if (key === ",") return "settings";
  if (key === "t" && event.shiftKey) return "toggle-tasks";
  if (key === "]" && event.shiftKey) return "next-tab";
  if (key === "[" && event.shiftKey) return "previous-tab";
  if (key === "tab" && event.shiftKey) return "previous-tab";
  if (key === "tab") return "next-tab";
  return undefined;
}
