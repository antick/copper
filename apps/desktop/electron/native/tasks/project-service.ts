import fs from "node:fs";
import path from "node:path";
import { isArchivedTaskPath } from "../../../shared/task-paths";
import { ARCHIVE_DIR } from "../constants";
import { CopperError } from "../errors";
import {
  archiveFile,
  createFile,
  readFile,
  saveFile,
  trashPath,
} from "../files/service";
import { openIndex } from "../index/db";
import { indexFilePath, removeIndexedPath } from "../index/indexer";
import {
  type Frontmatter,
  parseFrontmatter,
  writeFrontmatter,
} from "../markdown/frontmatter";
import { resolveInVault, toPosix } from "../path";
import { activeTaskArchivePatterns } from "./archive-service";
import {
  DEFAULT_PROJECT_STATUS,
  FRONTMATTER_KEYS,
  ISSUE_STATUSES,
  PROJECTS_DIR,
  TYPE_ISSUE,
  TYPE_PROJECT,
} from "./constants";
import {
  asOptionalString,
  asProjectStatus,
  asStringList,
  fileStemTitle,
  headingTitle,
  replaceHeading,
} from "./fields";
import { slugifyTitle } from "./ids";
import {
  ensureTaskFolders,
  listIssues,
  updateIssueForTransaction,
} from "./service";
import { fallbackTaskId } from "./task-identity";
import { findTaskPath } from "./task-lookup";
import type {
  CreateProjectInput,
  TaskProject,
  TaskProjectCounts,
  UpdateProjectInput,
  UpdateProjectWorkflowInput,
} from "./types";
import {
  DEFAULT_PROJECT_ICON,
  DEFAULT_WORKFLOW,
  isCustomStatus,
  parseWorkflow,
  projectIcon,
} from "./workflow";
import type { TaskWriteSnapshot } from "./write-rollback";
import { rollbackTaskWrites } from "./write-rollback";

function emptyCounts(): TaskProjectCounts {
  return Object.fromEntries(
    ISSUE_STATUSES.map((status) => [status, 0]),
  ) as TaskProjectCounts;
}

function projectFromParsed(
  relative: string,
  parsed: Frontmatter,
  counts: TaskProjectCounts,
): TaskProject {
  const storedId = parsed.values[FRONTMATTER_KEYS.id];
  const id =
    typeof storedId === "string" && storedId.length > 0
      ? storedId
      : fallbackTaskId(relative, "project");
  return {
    path: toPosix(relative),
    id,
    title: headingTitle(parsed.body, fileStemTitle(relative)),
    status: asProjectStatus(parsed.values[FRONTMATTER_KEYS.status]),
    labels: asStringList(parsed.values[FRONTMATTER_KEYS.labels]),
    start: asOptionalString(parsed.values[FRONTMATTER_KEYS.start]),
    target: asOptionalString(parsed.values[FRONTMATTER_KEYS.target]),
    icon: projectIcon(parsed.values[FRONTMATTER_KEYS.icon]),
    workflow: parseWorkflow(id, parsed.values[FRONTMATTER_KEYS.workflow]),
    archived:
      isArchivedTaskPath(relative) || relative.startsWith(`${ARCHIVE_DIR}/`),
    counts,
    body: parsed.body,
  };
}

function writeProjectValues(
  values: Record<string, unknown>,
  project: Pick<
    TaskProject,
    "id" | "status" | "labels" | "start" | "target" | "icon" | "workflow"
  >,
): Record<string, unknown> {
  return {
    ...values,
    [FRONTMATTER_KEYS.type]: TYPE_PROJECT,
    [FRONTMATTER_KEYS.id]: project.id,
    [FRONTMATTER_KEYS.status]: project.status,
    [FRONTMATTER_KEYS.labels]: project.labels,
    [FRONTMATTER_KEYS.start]: project.start,
    [FRONTMATTER_KEYS.target]: project.target,
    [FRONTMATTER_KEYS.icon]: project.icon,
    [FRONTMATTER_KEYS.workflow]: project.workflow,
  };
}

function labelsFor(db: ReturnType<typeof openIndex>, filePath: string) {
  return db
    .prepare("SELECT label FROM task_labels WHERE path = ? ORDER BY label")
    .all(filePath)
    .map((row) => (row as { label: string }).label);
}

function countsByProject(db: ReturnType<typeof openIndex>) {
  const map = new Map<string | null, TaskProjectCounts>();
  const archivePatterns = activeTaskArchivePatterns();
  const rows = db
    .prepare(
      `SELECT project_id, status, count(*) as n FROM tasks
       WHERE kind = ? AND path NOT LIKE ? AND path NOT LIKE ?
       GROUP BY project_id, status`,
    )
    .all(TYPE_ISSUE, ...archivePatterns) as Array<{
    project_id: string | null;
    status: string;
    n: number;
  }>;
  for (const row of rows) {
    const current = map.get(row.project_id) ?? emptyCounts();
    current[row.status] = (current[row.status] ?? 0) + row.n;
    map.set(row.project_id, current);
  }
  return map;
}

export function listProjects(dbPath: string): TaskProject[] {
  const db = openIndex(dbPath);
  try {
    const counts = countsByProject(db);
    const rows = db
      .prepare(
        "SELECT path, id, status, title FROM tasks WHERE kind = ? ORDER BY title ASC",
      )
      .all(TYPE_PROJECT) as Array<{
      path: string;
      id: string;
      status: string;
      title: string;
    }>;
    return rows.map((row) => {
      let values: Record<string, unknown> = {};
      try {
        const file = db
          .prepare("SELECT frontmatter_json FROM files WHERE path = ?")
          .get(row.path) as { frontmatter_json: string } | undefined;
        values = file?.frontmatter_json
          ? (JSON.parse(file.frontmatter_json) as Record<string, unknown>)
          : {};
      } catch {
        // Optional metadata falls back safely.
      }
      return {
        path: row.path,
        id: row.id,
        title: row.title,
        status: asProjectStatus(row.status),
        labels: labelsFor(db, row.path),
        start: asOptionalString(values.start),
        target: asOptionalString(values.target),
        icon: projectIcon(values.icon),
        workflow: parseWorkflow(row.id, values.workflow),
        archived:
          isArchivedTaskPath(row.path) ||
          row.path.startsWith(`${ARCHIVE_DIR}/`),
        counts: counts.get(row.id) ?? emptyCounts(),
      };
    });
  } finally {
    db.close();
  }
}

function findProjectPath(root: string, id: string): string {
  return findTaskPath(root, "project", id, { includeArchived: true });
}

export function getProject(
  root: string,
  dbPath: string,
  id: string,
): TaskProject {
  const relative = findProjectPath(root, id);
  const [source] = readFile(root, relative);
  const db = openIndex(dbPath);
  try {
    const counts = countsByProject(db).get(id) ?? emptyCounts();
    return projectFromParsed(relative, parseFrontmatter(source), counts);
  } finally {
    db.close();
  }
}

function uniqueProjectPath(root: string, stem: string) {
  let candidate = `${PROJECTS_DIR}/${stem}.md`;
  let suffix = 2;
  while (fs.existsSync(path.join(root, candidate))) {
    candidate = `${PROJECTS_DIR}/${stem}-${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}

export function createProject(
  root: string,
  dbPath: string,
  input: CreateProjectInput,
): TaskProject {
  ensureTaskFolders(root);
  const title = input.name.trim() || "Untitled";
  let id = slugifyTitle(title) || "project";
  const ids = new Set(listProjects(dbPath).map((project) => project.id));
  if (ids.has(id)) {
    let suffix = 2;
    while (ids.has(`${id}-${suffix}`)) suffix += 1;
    id = `${id}-${suffix}`;
  }
  const relative = uniqueProjectPath(root, id);
  const workflow = parseWorkflow(id, input.workflow ?? DEFAULT_WORKFLOW);
  if (
    input.workflow &&
    JSON.stringify(workflow) !== JSON.stringify(input.workflow)
  ) {
    throw CopperError.invalid("Project workflow is invalid");
  }
  const project = {
    id,
    status: input.status ?? DEFAULT_PROJECT_STATUS,
    labels: input.labels ?? [],
    start: input.start ?? null,
    target: input.target ?? null,
    icon: projectIcon(input.icon ?? DEFAULT_PROJECT_ICON),
    workflow,
  };
  const parsed: Frontmatter = {
    raw: "",
    body: `# ${title}\n`,
    values: writeProjectValues({}, project),
  };
  createFile(root, relative, writeFrontmatter(parsed, ""));
  indexFilePath(dbPath, root, relative);
  return getProject(root, dbPath, id);
}

function updateProjectInternal(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateProjectInput,
  onWrite?: (snapshot: TaskWriteSnapshot) => void,
): TaskProject {
  const relative = findProjectPath(root, id);
  const [source, revision] = readFile(root, relative);
  const parsed = parseFrontmatter(source);
  const current = projectFromParsed(relative, parsed, emptyCounts());
  const title = input.title?.trim() || current.title;
  const body =
    input.body !== undefined
      ? input.title
        ? replaceHeading(input.body, title)
        : input.body
      : input.title
        ? replaceHeading(parsed.body, title)
        : parsed.body;
  const workflow = input.workflow
    ? parseWorkflow(id, input.workflow)
    : current.workflow;
  if (
    input.workflow &&
    JSON.stringify(workflow) !== JSON.stringify(input.workflow)
  ) {
    throw CopperError.invalid("Project workflow is invalid");
  }
  const values = writeProjectValues(parsed.values, {
    id,
    status: input.status ?? current.status,
    labels: input.labels ?? current.labels,
    start: input.start === undefined ? current.start : input.start,
    target: input.target === undefined ? current.target : input.target,
    icon: projectIcon(input.icon ?? current.icon),
    workflow,
  });
  const next = writeFrontmatter({ ...parsed, values, body }, source);
  if (next !== source) {
    const written = saveFile(root, relative, next, revision.hash);
    onWrite?.({ path: relative, source, writtenHash: written.hash });
  }
  indexFilePath(dbPath, root, relative);
  return getProject(root, dbPath, id);
}

export function updateProject(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateProjectInput,
): TaskProject {
  return updateProjectInternal(root, dbPath, id, input);
}

function updateProjectForTransaction(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateProjectInput,
  onWrite: (snapshot: TaskWriteSnapshot) => void,
): TaskProject {
  return updateProjectInternal(root, dbPath, id, input, onWrite);
}

export function updateProjectWorkflow(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateProjectWorkflowInput,
): TaskProject {
  getProject(root, dbPath, id);
  const workflow = parseWorkflow(id, input.workflow);
  if (JSON.stringify(workflow) !== JSON.stringify(input.workflow)) {
    throw CopperError.invalid("Project workflow is invalid");
  }
  const affected = input.archivedStatusId
    ? listIssues(dbPath).filter(
        (issue) =>
          issue.project === id && issue.status === input.archivedStatusId,
      )
    : [];
  if (
    affected.length &&
    !workflow.some((item) => item.id === input.fallbackStatusId)
  ) {
    throw CopperError.invalid("Choose a valid fallback column");
  }
  const writes: TaskWriteSnapshot[] = [];
  const trackWrite = (snapshot: TaskWriteSnapshot) => writes.push(snapshot);
  try {
    for (const issue of affected) {
      updateIssueForTransaction(
        root,
        dbPath,
        issue.id,
        { status: input.fallbackStatusId },
        trackWrite,
      );
    }
    return updateProjectForTransaction(
      root,
      dbPath,
      id,
      { workflow },
      trackWrite,
    );
  } catch (error) {
    rollbackTaskWrites(root, dbPath, writes);
    throw error;
  }
}

export function archiveProject(root: string, dbPath: string, id: string) {
  const project = getProject(root, dbPath, id);
  if (project.archived)
    throw CopperError.invalid("Project is already archived");
  const destination = archiveFile(root, project.path);
  removeIndexedPath(dbPath, project.path);
  indexFilePath(dbPath, root, destination);
}

export async function deleteProject(
  root: string,
  dbPath: string,
  id: string,
  trashBackend: (absolute: string) => Promise<void>,
) {
  const project = getProject(root, dbPath, id);
  const affected = listIssues(dbPath).filter((issue) => issue.project === id);
  const writes: TaskWriteSnapshot[] = [];
  const trackWrite = (snapshot: TaskWriteSnapshot) => writes.push(snapshot);
  let projectSourceForTrash: string | undefined;
  let trashBackendStarted = false;
  try {
    for (const issue of affected) {
      updateIssueForTransaction(
        root,
        dbPath,
        issue.id,
        {
          project: null,
          status: isCustomStatus(issue.status) ? "todo" : issue.status,
        },
        trackWrite,
      );
    }
    removeIndexedPath(dbPath, project.path);
    projectSourceForTrash = readFile(root, project.path)[0];
    await trashPath(root, project.path, async (absolute) => {
      trashBackendStarted = true;
      return trashBackend(absolute);
    });
  } catch (error) {
    rollbackTaskWrites(root, dbPath, writes);
    try {
      const projectAbsolute = resolveInVault(root, project.path);
      if (
        trashBackendStarted &&
        projectSourceForTrash !== undefined &&
        !fs.existsSync(projectAbsolute)
      ) {
        createFile(root, project.path, projectSourceForTrash);
      }
    } catch {
      // Failed trash compensation must not replace the original failure.
    }
    try {
      const projectAbsolute = resolveInVault(root, project.path);
      if (fs.existsSync(projectAbsolute)) {
        indexFilePath(dbPath, root, project.path);
      } else {
        removeIndexedPath(dbPath, project.path);
      }
    } catch {
      // Index repair must not replace the original failure.
    }
    throw error;
  }
}
