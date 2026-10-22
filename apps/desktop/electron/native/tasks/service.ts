import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  compareTaskOrder,
  firstRank,
  insertionRank,
  issueInsertionIndex,
} from "../../../shared/task-order";
import { CopperError } from "../errors";
import { createFile, createFolder, readFile, saveFile } from "../files/service";
import { openIndex } from "../index/db";
import { indexFilePath } from "../index/indexer";
import {
  type Frontmatter,
  parseFrontmatter,
  writeFrontmatter,
} from "../markdown/frontmatter";
import { toPosix } from "../path";
import {
  activeTaskArchivePatterns,
  isArchivedTaskSourcePath,
} from "./archive-service";
import {
  DEFAULT_ISSUE_PRIORITY,
  DEFAULT_ISSUE_STATUS,
  FRONTMATTER_KEYS,
  ISSUES_DIR,
  PROJECTS_DIR,
  TASKS_DIR,
  TYPE_ISSUE,
} from "./constants";
import {
  asIssuePriority,
  asIssueStatus,
  asOptionalString,
  asStringList,
  asTaskComments,
  fileStemTitle,
  headingTitle,
  replaceHeading,
} from "./fields";
import { allocateIssueId, slugifyTitle } from "./ids";
import { migrateTaskStorage } from "./storage";
import { findTaskPath, sameTaskIdentity } from "./task-lookup";
import type {
  CreateIssueInput,
  MoveIssueInput,
  TaskComment,
  TaskIssue,
  UpdateIssueInput,
} from "./types";
import type { TaskWriteSnapshot } from "./write-rollback";
import { rollbackTaskWrites } from "./write-rollback";

function nowIso(): string {
  return new Date().toISOString();
}

export function ensureTaskFolders(root: string): void {
  migrateTaskStorage(root);
  createFolder(root, TASKS_DIR);
  createFolder(root, ISSUES_DIR);
  createFolder(root, PROJECTS_DIR);
}

function uniquePath(root: string, directory: string, stem: string): string {
  let candidate = `${directory}/${stem}.md`;
  let suffix = 2;
  while (fs.existsSync(path.join(root, candidate))) {
    candidate = `${directory}/${stem}-${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}

function issueFromParsed(relative: string, parsed: Frontmatter): TaskIssue {
  const id =
    typeof parsed.values[FRONTMATTER_KEYS.id] === "string"
      ? String(parsed.values[FRONTMATTER_KEYS.id])
      : fileStemTitle(relative);
  const title = headingTitle(parsed.body, fileStemTitle(relative));
  return {
    path: toPosix(relative),
    id,
    title,
    status: asIssueStatus(parsed.values[FRONTMATTER_KEYS.status]),
    priority: asIssuePriority(parsed.values[FRONTMATTER_KEYS.priority]),
    project: asOptionalString(parsed.values[FRONTMATTER_KEYS.project]),
    labels: asStringList(parsed.values[FRONTMATTER_KEYS.labels]),
    due: asOptionalString(parsed.values[FRONTMATTER_KEYS.due]),
    rank:
      typeof parsed.values[FRONTMATTER_KEYS.rank] === "string"
        ? String(parsed.values[FRONTMATTER_KEYS.rank])
        : firstRank(),
    created: asOptionalString(parsed.values[FRONTMATTER_KEYS.created]) ?? "",
    updated: asOptionalString(parsed.values[FRONTMATTER_KEYS.updated]) ?? "",
    comments: asTaskComments(parsed.values[FRONTMATTER_KEYS.comments]),
    body: parsed.body,
  };
}

function writeIssueValues(
  values: Record<string, unknown>,
  issue: Omit<TaskIssue, "path" | "body" | "title"> & { title?: string },
): Record<string, unknown> {
  return {
    ...values,
    [FRONTMATTER_KEYS.type]: TYPE_ISSUE,
    [FRONTMATTER_KEYS.id]: issue.id,
    [FRONTMATTER_KEYS.status]: issue.status,
    [FRONTMATTER_KEYS.priority]: issue.priority,
    [FRONTMATTER_KEYS.project]: issue.project,
    [FRONTMATTER_KEYS.labels]: issue.labels,
    [FRONTMATTER_KEYS.due]: issue.due,
    [FRONTMATTER_KEYS.rank]: issue.rank,
    [FRONTMATTER_KEYS.created]: issue.created,
    [FRONTMATTER_KEYS.updated]: issue.updated,
  };
}

function labelsFor(
  db: ReturnType<typeof openIndex>,
  filePath: string,
): string[] {
  return db
    .prepare("SELECT label FROM task_labels WHERE path = ? ORDER BY label")
    .all(filePath)
    .map((row) => (row as { label: string }).label);
}

export function listIssues(
  dbPath: string,
  options: { includeArchived?: boolean } = {},
): TaskIssue[] {
  const db = openIndex(dbPath);
  try {
    const archivePatterns = activeTaskArchivePatterns();
    const sql = options.includeArchived
      ? `SELECT path, id, status, priority, project_id, due, rank, title, created, updated
         FROM tasks WHERE kind = ? ORDER BY rank ASC, id ASC`
      : `SELECT path, id, status, priority, project_id, due, rank, title, created, updated
         FROM tasks
         WHERE kind = ? AND path NOT LIKE ? AND path NOT LIKE ?
         ORDER BY rank ASC, id ASC`;
    const query = db.prepare(sql);
    const rows = (
      options.includeArchived
        ? query.all(TYPE_ISSUE)
        : query.all(TYPE_ISSUE, ...archivePatterns)
    ) as Array<{
      path: string;
      id: string;
      status: string;
      priority: string;
      project_id: string | null;
      due: string | null;
      rank: string;
      title: string;
      created: string | null;
      updated: string | null;
    }>;
    return rows
      .filter(
        (row) => options.includeArchived || !isArchivedTaskSourcePath(row.path),
      )
      .map((row) => ({
        path: row.path,
        id: row.id,
        title: row.title,
        status: asIssueStatus(row.status),
        priority: asIssuePriority(row.priority),
        project: row.project_id,
        labels: labelsFor(db, row.path),
        due: row.due,
        rank: row.rank,
        created: row.created ?? "",
        updated: row.updated ?? "",
      }));
  } finally {
    db.close();
  }
}

export function getIssue(root: string, id: string): TaskIssue {
  const relative = findIssuePath(root, id);
  const [source] = readFile(root, relative);
  return issueFromParsed(relative, parseFrontmatter(source));
}

function findIssuePath(root: string, id: string): string {
  return findTaskPath(root, "issue", id);
}

export function createIssue(
  root: string,
  dbPath: string,
  input: CreateIssueInput,
  issueIdPrefix?: string,
): TaskIssue {
  ensureTaskFolders(root);
  const id = allocateIssueId(root, issueIdPrefix);
  const title = input.title.trim() || "Untitled";
  const created = nowIso();
  const status = input.status ?? DEFAULT_ISSUE_STATUS;
  const column = listIssues(dbPath).filter((issue) => issue.status === status);
  const named = input.afterId
    ? column.find((issue) => issue.id === input.afterId)
    : undefined;
  const after = named ?? column.at(-1);
  return writeAtPosition(
    root,
    dbPath,
    column,
    after ? column.indexOf(after) + 1 : 0,
    (rank) => {
      const relative = uniquePath(
        root,
        ISSUES_DIR,
        `${id}-${slugifyTitle(title)}`,
      );
      const extra = input.body?.trim();
      const body = extra ? `# ${title}\n\n${extra}\n` : `# ${title}\n`;
      const parsed: Frontmatter = {
        raw: "",
        body,
        values: writeIssueValues(
          {},
          {
            id,
            status,
            priority: input.priority ?? DEFAULT_ISSUE_PRIORITY,
            project: input.project ?? null,
            labels: input.labels ?? [],
            due: input.due ?? null,
            rank,
            created,
            updated: created,
          },
        ),
      };
      createFile(root, relative, writeFrontmatter(parsed, ""));
      indexFilePath(dbPath, root, relative);
      return getIssue(root, id);
    },
  );
}

function updateIssueInternal(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateIssueInput,
  onWrite?: (snapshot: TaskWriteSnapshot) => void,
): TaskIssue {
  const relative = findIssuePath(root, id);
  const [source, revision] = readFile(root, relative);
  const parsed = parseFrontmatter(source);
  const current = issueFromParsed(relative, parsed);
  const title = input.title?.trim() ?? current.title;
  const body =
    input.body !== undefined
      ? input.title
        ? replaceHeading(input.body, title)
        : input.body
      : input.title
        ? replaceHeading(parsed.body, title)
        : parsed.body;
  const nextValues = writeIssueValues(parsed.values, {
    id: current.id,
    status: input.status ?? current.status,
    priority: input.priority ?? current.priority,
    project: input.project === undefined ? current.project : input.project,
    labels: input.labels ?? current.labels,
    due: input.due === undefined ? current.due : input.due,
    rank: input.rank ?? current.rank,
    created: current.created || nowIso(),
    updated: nowIso(),
  });
  const next = writeFrontmatter(
    { ...parsed, values: nextValues, body },
    source,
  );
  if (next !== source) {
    const written = saveFile(root, relative, next, revision.hash);
    onWrite?.({ path: relative, source, writtenHash: written.hash });
  }
  indexFilePath(dbPath, root, relative);
  return getIssue(root, id);
}

export function updateIssue(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateIssueInput,
): TaskIssue {
  return updateIssueInternal(root, dbPath, id, input);
}

export function updateIssueForTransaction(
  root: string,
  dbPath: string,
  id: string,
  input: UpdateIssueInput,
  onWrite: (snapshot: TaskWriteSnapshot) => void,
): TaskIssue {
  return updateIssueInternal(root, dbPath, id, input, onWrite);
}

function commentBody(value: string): string {
  const body = typeof value === "string" ? value.trim() : "";
  if (!body) throw CopperError.invalid("Comment body is required");
  return body;
}

function mutateIssueComments(
  root: string,
  dbPath: string,
  id: string,
  mutate: (comments: TaskComment[], updated: string) => TaskComment[],
): TaskIssue {
  const relative = findIssuePath(root, id);
  const [source, revision] = readFile(root, relative);
  const parsed = parseFrontmatter(source);
  const updated = nowIso();
  const comments = mutate(
    asTaskComments(parsed.values[FRONTMATTER_KEYS.comments]),
    updated,
  );
  const values = {
    ...parsed.values,
    [FRONTMATTER_KEYS.comments]: comments,
    [FRONTMATTER_KEYS.updated]: updated,
  };
  const next = writeFrontmatter({ ...parsed, values }, source);
  if (next !== source) saveFile(root, relative, next, revision.hash);
  indexFilePath(dbPath, root, relative);
  return getIssue(root, id);
}

export function addIssueComment(
  root: string,
  dbPath: string,
  id: string,
  body: string,
): TaskIssue {
  const commentBodyValue = commentBody(body);
  return mutateIssueComments(root, dbPath, id, (comments, updated) => [
    ...comments,
    {
      id: randomUUID(),
      body: commentBodyValue,
      created: updated,
      updated,
    },
  ]);
}

export function updateIssueComment(
  root: string,
  dbPath: string,
  id: string,
  commentId: string,
  body: string,
): TaskIssue {
  const commentBodyValue = commentBody(body);
  return mutateIssueComments(root, dbPath, id, (comments, updated) => {
    const index = comments.findIndex((comment) => comment.id === commentId);
    if (index < 0) {
      throw CopperError.notFound(`Comment ${commentId} was not found`);
    }
    const next = [...comments];
    const current = next[index];
    next[index] = { ...current, body: commentBodyValue, updated };
    return next;
  });
}

export function deleteIssueComment(
  root: string,
  dbPath: string,
  id: string,
  commentId: string,
): TaskIssue {
  return mutateIssueComments(root, dbPath, id, (comments) => {
    const index = comments.findIndex((comment) => comment.id === commentId);
    if (index < 0) {
      throw CopperError.notFound(`Comment ${commentId} was not found`);
    }
    return comments.filter((comment) => comment.id !== commentId);
  });
}

export function moveIssue(
  root: string,
  dbPath: string,
  id: string,
  input: MoveIssueInput,
): TaskIssue {
  const issues = listIssues(dbPath);
  const current =
    issues.find((issue) => issue.id === id) ??
    issues.find((issue) => sameTaskIdentity("issue", issue.id, id));
  if (!current) {
    throw CopperError.notFound(`Issue ${id} was not found`);
  }
  const status = input.status ?? current.status;
  const column = issues
    .filter(
      (issue) =>
        issue.status === status && !sameTaskIdentity("issue", issue.id, id),
    )
    .sort(compareTaskOrder);
  return writeAtPosition(
    root,
    dbPath,
    column,
    issueInsertionIndex(column, input),
    (rank, onWrite) =>
      updateIssueInternal(root, dbPath, id, { status, rank }, onWrite),
  );
}

function writeAtPosition(
  root: string,
  dbPath: string,
  column: TaskIssue[],
  index: number,
  write: (
    rank: string,
    onWrite?: (snapshot: TaskWriteSnapshot) => void,
  ) => TaskIssue,
): TaskIssue {
  const { rank, repairs } = insertionRank(column, index);
  const writes: TaskWriteSnapshot[] = [];
  const trackWrite = (snapshot: TaskWriteSnapshot) => writes.push(snapshot);
  try {
    for (const repair of repairs) {
      updateIssueInternal(
        root,
        dbPath,
        repair.id,
        { rank: repair.rank },
        trackWrite,
      );
    }
    return write(rank, trackWrite);
  } catch (error) {
    rollbackTaskWrites(root, dbPath, writes);
    throw error;
  }
}
