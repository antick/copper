// The bridge accepts data, never executable callbacks or renderer trust flags.
type Rule = (value: unknown) => boolean;
const text: Rule = (value) => typeof value === "string";
const number: Rule = (value) =>
  typeof value === "number" && Number.isFinite(value);
const boolean: Rule = (value) => typeof value === "boolean";
const record: Rule = (value) =>
  value !== null &&
  typeof value === "object" &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);
const strings: Rule = (value) => Array.isArray(value) && value.every(text);
const nullable =
  (rule: Rule): Rule =>
  (value) =>
    value === null || rule(value);
const optional =
  (rule: Rule): Rule =>
  (value) =>
    value === undefined || rule(value);
const object =
  (fields: Record<string, Rule>): Rule =>
  (value) =>
    record(value) &&
    Object.keys(value as object).every((key) => Object.hasOwn(fields, key)) &&
    Object.entries(fields).every(([key, rule]) =>
      rule((value as Record<string, unknown>)[key]),
    );
const list =
  (rule: Rule): Rule =>
  (value) =>
    Array.isArray(value) && value.every(rule);
const workflow = list(
  object({ id: text, label: text, category: text, hidden: optional(boolean) }),
);
const vaultId: Rule = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const vault = { vaultId };
const file = { ...vault, path: text };
const entity = { ...vault, id: text };
const issueFields = {
  title: optional(text),
  status: optional(text),
  priority: optional(text),
  project: optional(nullable(text)),
  labels: optional(strings),
  due: optional(nullable(text)),
  rank: optional(text),
  body: optional(text),
};
const projectFields = {
  title: optional(text),
  status: optional(text),
  labels: optional(strings),
  start: optional(nullable(text)),
  target: optional(nullable(text)),
  icon: optional(text),
  workflow: optional(workflow),
  body: optional(text),
};
const settings = object({
  theme: text,
  lightTheme: text,
  darkTheme: text,
  fontSize: number,
  lineHeight: number,
  tabSize: number,
  wrapping: boolean,
  attachmentFolder: text,
  navigationLayout: text,
  issueIdPrefix: text,
});
const session = object({
  tabs: list(object({ path: text, preview: boolean })),
  activePath: nullable(text),
  leftCollapsed: boolean,
  rightCollapsed: boolean,
  favorites: strings,
  workspaceMode: text,
  tasksView: text,
  tasksProject: nullable(text),
  tasksDestination: text,
  tasksProjectView: text,
  tasksTabs: list(record),
  activeTasksTabId: nullable(text),
  tasksProjectOrder: strings,
  tasksPinnedProjects: strings,
  tasksListColumnWidths: record,
});

const commands: Record<string, Record<string, Rule>> = {
  app_info: {},
  list_recent_vaults: {},
  pick_vault_folder: {},
  open_vault: { path: text },
  close_vault: vault,
  vault_tree: vault,
  resolve_path: file,
  read_file: file,
  binary_file_metadata: file,
  read_binary_file: file,
  save_file: { ...file, contents: text },
  create_file: { ...file, contents: optional(text) },
  create_folder: file,
  rename_path: { ...vault, from: text, to: text },
  archive_file: file,
  restore_file: file,
  trash_path: file,
  import_attachment: { ...vault, sourcePath: text, attachmentFolder: text },
  rebuild_vault_index: vault,
  index_open_vault: vault,
  index_file_path: file,
  remove_indexed_file: file,
  search_vault: { ...vault, query: text, folder: optional(text) },
  list_notes: { ...vault, folder: optional(text) },
  read_properties: file,
  update_properties: {
    ...file,
    properties: object({ raw: text, body: text, values: record }),
  },
  list_backlinks: file,
  load_settings: {},
  save_settings: { settings },
  load_session: vault,
  save_session: { ...vault, session },
  list_issues: vault,
  get_issue: entity,
  create_issue: {
    ...vault,
    ...issueFields,
    title: text,
    afterId: optional(nullable(text)),
  },
  update_issue: { ...entity, ...issueFields },
  move_issue: {
    ...entity,
    status: optional(text),
    afterId: optional(nullable(text)),
    beforeId: optional(nullable(text)),
  },
  add_issue_comment: { ...entity, body: text },
  update_issue_comment: { ...entity, commentId: text, body: text },
  delete_issue_comment: { ...entity, commentId: text },
  list_projects: vault,
  get_project: entity,
  create_project: { ...vault, ...projectFields, name: text },
  update_project: { ...entity, ...projectFields },
  update_project_workflow: {
    ...entity,
    workflow,
    archivedStatusId: optional(text),
    fallbackStatusId: optional(text),
  },
  archive_project: entity,
  delete_project: entity,
  git_status: vault,
  git_diff: file,
  git_publish: vault,
  git_enable: vault,
  check_for_update: {},
  download_update: {},
  install_update: {},
  relaunch_app: {},
};

export const MAX_COMMAND_BYTES = 32 * 1024 * 1024;
const MAX_DATA_DEPTH = 32;
function dataOnly(value: unknown, depth = 0): boolean {
  if (depth > MAX_DATA_DEPTH) return false;
  if (
    value === null ||
    value === undefined ||
    text(value) ||
    boolean(value) ||
    number(value)
  )
    return true;
  if (Array.isArray(value))
    return value.every((item) => dataOnly(item, depth + 1));
  return (
    record(value) &&
    Object.entries(value as object).every(
      ([key, item]) =>
        !["__proto__", "prototype", "constructor"].includes(key) &&
        dataOnly(item, depth + 1),
    )
  );
}

export function validateInvocation(
  command: unknown,
  args: unknown,
): Record<string, unknown> {
  const payload = args === undefined ? {} : args;
  if (
    typeof command !== "string" ||
    !Object.hasOwn(commands, command) ||
    !dataOnly(payload) ||
    !object(commands[command])(payload) ||
    JSON.stringify(payload).length > MAX_COMMAND_BYTES
  ) {
    throw new Error("Invalid Copper command or arguments");
  }
  return payload as Record<string, unknown>;
}
