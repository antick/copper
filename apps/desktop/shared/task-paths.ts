export const ARCHIVE_DIR = "Archive";
export const COPPER_DIR = ".copper";
export const TASKS_DIR = `${COPPER_DIR}/tasks`;
export const ISSUES_DIR = `${TASKS_DIR}/issues`;
export const PROJECTS_DIR = `${TASKS_DIR}/projects`;
export const TASK_ARCHIVE_DIR = `${TASKS_DIR}/archive`;
export const ARCHIVED_ISSUES_DIR = `${TASK_ARCHIVE_DIR}/issues`;
export const ARCHIVED_PROJECTS_DIR = `${TASK_ARCHIVE_DIR}/projects`;
export const LEGACY_TASKS_DIR = "Tasks";
export const LEGACY_TASK_ARCHIVE_DIR = `${ARCHIVE_DIR}/${LEGACY_TASKS_DIR}`;
export const LEGACY_TASK_DIRECTORIES = [
  { from: `${LEGACY_TASKS_DIR}/Issues`, to: ISSUES_DIR, kind: "issue" },
  { from: `${LEGACY_TASKS_DIR}/Projects`, to: PROJECTS_DIR, kind: "project" },
  {
    from: `${LEGACY_TASK_ARCHIVE_DIR}/Issues`,
    to: ARCHIVED_ISSUES_DIR,
    kind: "issue",
  },
  {
    from: `${LEGACY_TASK_ARCHIVE_DIR}/Projects`,
    to: ARCHIVED_PROJECTS_DIR,
    kind: "project",
  },
] as const;
const SOURCE_DIRECTORIES = [
  ISSUES_DIR,
  PROJECTS_DIR,
  ARCHIVED_ISSUES_DIR,
  ARCHIVED_PROJECTS_DIR,
];

export function isTaskSourcePath(value: string) {
  if (value.startsWith(`${ARCHIVE_DIR}/`))
    value = value.slice(ARCHIVE_DIR.length + 1);
  return SOURCE_DIRECTORIES.some(
    (dir) =>
      value.startsWith(`${dir}/`) &&
      /^[^/.][^/]*\.(md|markdown)$/i.test(value.slice(dir.length + 1)),
  );
}

export function isTaskStorageDirectory(value: string) {
  if (value.startsWith(`${ARCHIVE_DIR}/`))
    value = value.slice(ARCHIVE_DIR.length + 1);
  return [
    COPPER_DIR,
    TASKS_DIR,
    TASK_ARCHIVE_DIR,
    ...SOURCE_DIRECTORIES,
  ].includes(value);
}

export function isArchivedTaskPath(value: string) {
  return value.startsWith(`${TASK_ARCHIVE_DIR}/`);
}

export function isHiddenTaskContent(value: string) {
  return (
    value === COPPER_DIR ||
    value.startsWith(`${COPPER_DIR}/`) ||
    value === `${ARCHIVE_DIR}/${COPPER_DIR}` ||
    value.startsWith(`${ARCHIVE_DIR}/${COPPER_DIR}/`)
  );
}

export function isArchivedPath(value: string) {
  return (
    value === ARCHIVE_DIR ||
    value.startsWith(`${ARCHIVE_DIR}/`) ||
    isArchivedTaskPath(value)
  );
}
