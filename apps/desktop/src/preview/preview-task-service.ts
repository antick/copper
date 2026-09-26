import {
  DEFAULT_ISSUE_ID_PREFIX,
  formatIssueId,
  normalizeIssueIdPrefix,
  parseIssueIdentifier,
} from "@/lib/copper/task-settings";
import {
  parsePreviewFrontmatter,
  writePreviewMarkdown,
} from "@/preview/preview-markdown";

export const PREVIEW_TASK_UNHANDLED = Symbol("preview-task-unhandled");

const DEFAULT_WORKFLOW = [
  { id: "todo", label: "Todo", category: "unstarted" },
  { id: "in_progress", label: "In Progress", category: "started" },
  { id: "in_review", label: "In Review", category: "started" },
  { id: "done", label: "Done", category: "completed" },
  { id: "canceled", label: "Canceled", category: "canceled" },
];

export function parsePreviewWorkflow(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_WORKFLOW;
  if (value.some((item) => !item || typeof item !== "object")) {
    return DEFAULT_WORKFLOW;
  }
  const workflow = value as typeof DEFAULT_WORKFLOW;
  const ids = new Set(workflow.map(({ id }) => id));
  if (!["todo", "in_progress", "done", "canceled"].every((id) => ids.has(id))) {
    return DEFAULT_WORKFLOW;
  }
  if (workflow.some(({ id }) => id === "in_review")) return workflow;
  const upgraded = [...workflow];
  const progress = upgraded.findIndex(({ id }) => id === "in_progress");
  upgraded.splice(progress + 1, 0, { ...DEFAULT_WORKFLOW[2] });
  return upgraded;
}

function issueFromPath(files: Map<string, string>, filePath: string) {
  const parsed = parsePreviewFrontmatter(files, filePath);
  if (parsed.values.type !== "issue") return undefined;
  return {
    path: filePath,
    id: String(parsed.values.id ?? ""),
    title: /^#\s+(.+)$/m.exec(parsed.body)?.[1] ?? filePath,
    status: String(parsed.values.status ?? "todo"),
    priority: String(parsed.values.priority ?? "none"),
    project: parsed.values.project ? String(parsed.values.project) : null,
    labels: Array.isArray(parsed.values.labels)
      ? (parsed.values.labels as string[])
      : [],
    due: parsed.values.due ? String(parsed.values.due) : null,
    rank: String(parsed.values.rank ?? "V"),
    created: String(parsed.values.created ?? ""),
    updated: String(parsed.values.updated ?? ""),
    body: parsed.body,
  };
}

function projectFromPath(files: Map<string, string>, filePath: string) {
  const parsed = parsePreviewFrontmatter(files, filePath);
  if (parsed.values.type !== "project") return undefined;
  const id = String(parsed.values.id ?? "");
  const counts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    canceled: 0,
  };
  for (const issue of [...files.keys()].map((path) =>
    issueFromPath(files, path),
  )) {
    if (issue?.project === id)
      counts[issue.status] = (counts[issue.status] ?? 0) + 1;
  }
  return {
    path: filePath,
    id,
    title: /^#\s+(.+)$/m.exec(parsed.body)?.[1] ?? filePath,
    status: String(parsed.values.status ?? "planned"),
    labels: Array.isArray(parsed.values.labels)
      ? (parsed.values.labels as string[])
      : [],
    start: parsed.values.start ? String(parsed.values.start) : null,
    target: parsed.values.target ? String(parsed.values.target) : null,
    icon:
      parsed.values.icon === "target" || parsed.values.icon === "shapes"
        ? "folder"
        : String(parsed.values.icon ?? "folder"),
    workflow: parsePreviewWorkflow(parsed.values.workflow),
    archived: filePath.startsWith("Archive/"),
    counts,
    body: parsed.body,
  };
}

function issues(files: Map<string, string>) {
  return [...files.keys()]
    .map((path) => issueFromPath(files, path))
    .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));
}

function projects(files: Map<string, string>) {
  return [...files.keys()]
    .map((path) => projectFromPath(files, path))
    .filter((project): project is NonNullable<typeof project> =>
      Boolean(project),
    );
}

export function dispatchPreviewTask(
  command: string,
  payload: Record<string, unknown>,
  files: Map<string, string>,
  issueIdPrefix = DEFAULT_ISSUE_ID_PREFIX,
) {
  switch (command) {
    case "list_issues":
      return issues(files).sort(
        (a, b) => a.rank.localeCompare(b.rank) || a.id.localeCompare(b.id),
      );
    case "get_issue": {
      const issue = issues(files).find((item) => item.id === payload.id);
      if (!issue) throw new Error("Issue was not found");
      return issue;
    }
    case "create_issue": {
      const title = String(payload.title ?? "Untitled");
      const prefix = normalizeIssueIdPrefix(issueIdPrefix);
      const sequence = issues(files).reduce((max, issue) => {
        const parsed = parseIssueIdentifier(issue.id);
        return parsed?.prefix === prefix ? Math.max(max, parsed.sequence) : max;
      }, 0);
      const id = formatIssueId(prefix, sequence + 1);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const path = `Tasks/Issues/${id}-${slug || "issue"}.md`;
      const after = payload.afterId
        ? issues(files).find((item) => item.id === payload.afterId)
        : undefined;
      writePreviewMarkdown(
        files,
        path,
        {
          type: "issue",
          id,
          status: payload.status ?? "todo",
          priority: payload.priority ?? "none",
          project: payload.project ?? "",
          labels: payload.labels ?? [],
          due: payload.due ?? "",
          rank: after ? `${after.rank}m` : `Z${sequence + 1}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        payload.body
          ? `# ${title}\n\n${String(payload.body).trim()}\n`
          : `# ${title}\n`,
      );
      return issueFromPath(files, path);
    }
    case "update_issue":
    case "move_issue": {
      const current = issues(files).find((item) => item.id === payload.id);
      if (!current) throw new Error("Issue was not found");
      const parsed = parsePreviewFrontmatter(files, current.path);
      const status = String(payload.status ?? parsed.values.status ?? "todo");
      let rank = payload.rank ?? parsed.values.rank;
      if (command === "move_issue" && payload.rank === undefined) {
        const column = issues(files)
          .filter((item) => item.status === status && item.id !== current.id)
          .sort(
            (a, b) => a.rank.localeCompare(b.rank) || a.id.localeCompare(b.id),
          );
        const after = column.find((item) => item.id === payload.afterId);
        const before = column.find((item) => item.id === payload.beforeId);
        rank = after
          ? `${after.rank}m`
          : before
            ? `0${before.rank}`
            : column.at(-1)
              ? `${column.at(-1)?.rank}z`
              : "M";
      }
      const values = {
        ...parsed.values,
        status,
        priority: payload.priority ?? parsed.values.priority,
        project:
          payload.project === undefined
            ? parsed.values.project
            : (payload.project ?? ""),
        labels: payload.labels ?? parsed.values.labels,
        due:
          payload.due === undefined ? parsed.values.due : (payload.due ?? ""),
        rank,
        updated: new Date().toISOString(),
      };
      let body = typeof payload.body === "string" ? payload.body : parsed.body;
      if (typeof payload.title === "string") {
        body = /^#\s+/m.test(body)
          ? body.replace(/^#\s+.+$/m, `# ${payload.title}`)
          : `# ${payload.title}\n${body}`;
      }
      writePreviewMarkdown(files, current.path, values, body);
      return issueFromPath(files, current.path);
    }
    case "list_projects":
      return projects(files);
    case "get_project": {
      const project = projects(files).find((item) => item.id === payload.id);
      if (!project) throw new Error("Project was not found");
      return project;
    }
    case "create_project": {
      const name = String(payload.name ?? "Untitled");
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project";
      const path = `Tasks/Projects/${id}.md`;
      writePreviewMarkdown(
        files,
        path,
        {
          type: "project",
          id,
          status: payload.status ?? "planned",
          labels: payload.labels ?? [],
          icon: payload.icon ?? "folder",
          workflow: payload.workflow ?? DEFAULT_WORKFLOW,
        },
        `# ${name}\n`,
      );
      return projectFromPath(files, path);
    }
    case "update_project": {
      const current = projects(files).find((item) => item.id === payload.id);
      if (!current) throw new Error("Project was not found");
      const parsed = parsePreviewFrontmatter(files, current.path);
      let body = typeof payload.body === "string" ? payload.body : parsed.body;
      if (typeof payload.title === "string") {
        body = /^#\s+/m.test(body)
          ? body.replace(/^#\s+.+$/m, `# ${payload.title}`)
          : `# ${payload.title}\n${body}`;
      }
      writePreviewMarkdown(
        files,
        current.path,
        {
          ...parsed.values,
          status: payload.status ?? parsed.values.status,
          labels: payload.labels ?? parsed.values.labels,
          start:
            payload.start === undefined ? parsed.values.start : payload.start,
          target:
            payload.target === undefined
              ? parsed.values.target
              : payload.target,
          icon: payload.icon === undefined ? parsed.values.icon : payload.icon,
          workflow:
            payload.workflow === undefined
              ? parsed.values.workflow
              : payload.workflow,
        },
        body,
      );
      return projectFromPath(files, current.path);
    }
    case "update_project_workflow": {
      const current = projects(files).find((item) => item.id === payload.id);
      if (!current) throw new Error("Project was not found");
      if (payload.archivedStatusId && payload.fallbackStatusId) {
        for (const issue of issues(files).filter(
          (item) =>
            item.project === current.id &&
            item.status === payload.archivedStatusId,
        )) {
          const parsed = parsePreviewFrontmatter(files, issue.path);
          writePreviewMarkdown(
            files,
            issue.path,
            { ...parsed.values, status: payload.fallbackStatusId },
            parsed.body,
          );
        }
      }
      const parsed = parsePreviewFrontmatter(files, current.path);
      writePreviewMarkdown(
        files,
        current.path,
        { ...parsed.values, workflow: payload.workflow },
        parsed.body,
      );
      return projectFromPath(files, current.path);
    }
    case "archive_project": {
      const current = projects(files).find(
        (item) => item.id === payload.id && !item.archived,
      );
      if (!current) throw new Error("Project was not found");
      const source = files.get(current.path);
      if (source) {
        files.delete(current.path);
        files.set(`Archive/${current.path}`, source);
      }
      return null;
    }
    case "delete_project": {
      const current = projects(files).find((item) => item.id === payload.id);
      if (!current) throw new Error("Project was not found");
      files.delete(current.path);
      for (const issue of issues(files).filter(
        (item) => item.project === current.id,
      )) {
        const parsed = parsePreviewFrontmatter(files, issue.path);
        writePreviewMarkdown(
          files,
          issue.path,
          {
            ...parsed.values,
            project: "",
            status: issue.status.includes("--") ? "todo" : issue.status,
          },
          parsed.body,
        );
      }
      return null;
    }
    default:
      return PREVIEW_TASK_UNHANDLED;
  }
}
