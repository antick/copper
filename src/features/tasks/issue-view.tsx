import { ExternalLink, Gauge, X } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  type IssueCommentActions,
  IssueComments,
} from "@/features/tasks/issue-comments";
import { ProjectIcon } from "@/features/tasks/project-icons";
import { TaskDescriptionEditor } from "@/features/tasks/task-description-editor";
import { taskBody, taskDescription } from "@/features/tasks/task-selectors";
import {
  TASK_PRIORITY_OPTIONS,
  TaskDatePopover,
  TaskMutationError,
  TaskSelectMenu,
  TaskTextPopover,
} from "@/features/tasks/task-ui";
import {
  activeProjects,
  statusLabel,
  validStatusForProject,
  visibleProjectWorkflow,
} from "@/features/tasks/workflow";
import type {
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

export function IssueView({
  issue,
  projects,
  variant,
  onClose,
  onOpenInNewTab,
  onUpdate,
  commentActions,
}: {
  issue: TaskIssue;
  projects: TaskProject[];
  variant: "peek" | "tab";
  onClose?: () => void;
  onOpenInNewTab?: () => void;
  onUpdate: (input: UpdateIssueInput) => Promise<unknown>;
  commentActions: IssueCommentActions;
}) {
  const [title, setTitle] = useState(issue.title);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const issueProject = projects.find((project) => project.id === issue.project);
  const statusOptions = [
    { value: "backlog", label: "Backlog" },
    ...visibleProjectWorkflow(issueProject).map(({ id, label }) => ({
      value: id,
      label,
    })),
  ];
  if (!statusOptions.some((option) => option.value === issue.status)) {
    statusOptions.push({
      value: issue.status,
      label: statusLabel(issue.status, issueProject),
    });
  }
  useEffect(() => setTitle(issue.title), [issue.title]);

  async function commit(input: UpdateIssueInput, throwOnError = false) {
    setError(null);
    setNotice(null);
    try {
      await onUpdate(input);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The issue could not be saved. Try again.",
      );
      if (throwOnError) throw cause;
      return false;
    }
  }

  return (
    <section className="copper-issue-view" data-variant={variant}>
      <header className="copper-issue-view-header">
        <div className="copper-issue-breadcrumb">
          <span>Issues</span>
          <span aria-hidden>/</span>
          <strong>{issue.id}</strong>
        </div>
        <div className="copper-header-actions">
          {onOpenInNewTab ? (
            <Tooltip content="Open in new tab">
              <IconButton label="Open in new tab" onClick={onOpenInNewTab}>
                <ExternalLink size={15} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          ) : null}
          {onClose ? (
            <Tooltip
              content={variant === "peek" ? "Close issue" : "Close issue tab"}
            >
              <IconButton
                label={variant === "peek" ? "Close issue" : "Close issue tab"}
                onClick={onClose}
              >
                <X size={16} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
      </header>
      <div className="copper-scroll copper-issue-view-body">
        <main className="copper-issue-main">
          <input
            className="copper-task-detail-title"
            aria-label="Issue title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              if (title.trim() && title !== issue.title)
                void commit({ title: title.trim() });
            }}
          />
          <TaskMutationError message={error} />
          {notice ? (
            <p className="copper-task-notice" role="status">
              {notice}
            </p>
          ) : null}
          <div className="copper-task-detail-description">
            <TaskDescriptionEditor
              key={issue.id}
              documentId={issue.id}
              body={taskDescription(issue.body)}
              ariaLabel="Issue description"
              compact
              onSave={(body) =>
                commit(
                  {
                    body: taskBody(title.trim() || issue.title, body),
                  },
                  true,
                ).then(() => undefined)
              }
            />
          </div>
          <IssueComments
            comments={issue.comments ?? []}
            actions={commentActions}
          />
        </main>
        <aside
          className="copper-issue-properties"
          aria-label="Issue properties"
        >
          <TaskSelectMenu
            label="Issue status"
            value={issue.status}
            options={statusOptions}
            icon={<Gauge size={14} aria-hidden />}
            onChange={(status) => void commit({ status })}
          />
          <TaskSelectMenu
            label="Issue priority"
            value={issue.priority}
            options={TASK_PRIORITY_OPTIONS}
            onChange={(priority) => void commit({ priority })}
          />
          <TaskSelectMenu
            label="Issue project"
            value={issue.project ?? ""}
            options={[
              {
                value: "",
                label: "No project",
                icon: <ProjectIcon name="folder" size={14} />,
              },
              ...(issueProject?.archived
                ? [
                    {
                      value: issueProject.id,
                      label: `${issueProject.title} (archived)`,
                      icon: <ProjectIcon name={issueProject.icon} size={14} />,
                    },
                  ]
                : []),
              ...activeProjects(projects).map((project) => ({
                value: project.id,
                label: project.title,
                icon: <ProjectIcon name={project.icon} size={14} />,
              })),
            ]}
            onChange={(projectId) => {
              const next = projects.find((item) => item.id === projectId);
              const reset = !validStatusForProject(issue.status, next);
              void commit({
                project: projectId || null,
                status: reset ? "todo" : issue.status,
              }).then((updated) => {
                if (reset && updated)
                  setNotice("Status reset to Todo for the new project.");
              });
            }}
          />
          <TaskTextPopover
            label="Issue labels"
            value={issue.labels.join(", ")}
            placeholder="bug, ui"
            onChange={(value) =>
              void commit({
                labels: value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <TaskDatePopover
            label="Due date"
            value={issue.due ?? ""}
            onChange={(due) => void commit({ due: due || null })}
          />
        </aside>
      </div>
    </section>
  );
}
