import * as Dialog from "@radix-ui/react-dialog";
import { Gauge, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/features/tasks/constants";
import { ProjectIcon } from "@/features/tasks/project-icons";
import {
  TaskDescriptionEditor,
  type TaskDescriptionEditorHandle,
} from "@/features/tasks/task-description-editor";
import {
  TASK_PRIORITY_OPTIONS,
  TaskDatePopover,
  TaskMutationError,
  TaskSelectMenu,
  TaskTextPopover,
} from "@/features/tasks/task-ui";
import {
  activeProjects,
  validStatusForProject,
  visibleProjectWorkflow,
} from "@/features/tasks/workflow";
import type {
  CreateIssueInput,
  CreateProjectInput,
  IssuePriority,
  IssueStatus,
  ProjectStatus,
  TaskProject,
} from "@/lib/copper/tasks";

const PROJECT_STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({
  value,
  label: PROJECT_STATUS_LABELS[value],
}));

export function TaskCreateDialog({
  open,
  kind,
  projects,
  defaultProject,
  defaultStatus,
  onOpenChange,
  onSubmitIssue,
  onSubmitProject,
}: {
  open: boolean;
  kind: "issue" | "project";
  projects: TaskProject[];
  defaultProject: string | null;
  defaultStatus: IssueStatus;
  onOpenChange: (open: boolean) => void;
  onSubmitIssue: (input: CreateIssueInput) => Promise<void>;
  onSubmitProject: (input: CreateProjectInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const descriptionRef = useRef<TaskDescriptionEditorHandle>(null);
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("planned");
  const [priority, setPriority] = useState<IssuePriority>("none");
  const [project, setProject] = useState(defaultProject ?? "");
  const [labels, setLabels] = useState("");
  const [due, setDue] = useState("");
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setStatus(defaultStatus);
    setProjectStatus("planned");
    setPriority("none");
    setProject(defaultProject ?? "");
    setLabels("");
    setDue("");
    setStart("");
    setTarget("");
    setSaving(false);
    setError(null);
  }, [open, defaultProject, defaultStatus]);

  const selectedProject = projects.find((item) => item.id === project);
  const statusOptions = [
    { value: "backlog", label: "Backlog" },
    ...visibleProjectWorkflow(selectedProject).map(({ id, label }) => ({
      value: id,
      label,
    })),
  ];

  async function submit() {
    const name = title.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(null);
    try {
      const parsedLabels = labels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (kind === "project") {
        await onSubmitProject({
          name,
          status: projectStatus,
          labels: parsedLabels,
          start: start || null,
          target: target || null,
        });
      } else {
        await onSubmitIssue({
          title: name,
          body: descriptionRef.current?.getValue().trim() || undefined,
          status,
          priority,
          project: project || null,
          labels: parsedLabels,
          due: due || null,
        });
      }
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `The ${kind} could not be created. Try again.`,
      );
    } finally {
      setSaving(false);
    }
  }

  const heading = kind === "project" ? "New project" : "New issue";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="copper-task-dialog-overlay" />
        <Dialog.Content
          className="copper-task-composer"
          aria-describedby={undefined}
        >
          <header className="copper-task-composer-header">
            <Dialog.Title>{heading}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="copper-icon-button"
                aria-label={`Close ${heading.toLowerCase()}`}
              >
                <X size={16} aria-hidden />
              </button>
            </Dialog.Close>
          </header>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <input
              autoFocus
              className="copper-task-composer-title"
              value={title}
              placeholder={kind === "project" ? "Project name" : "Issue title"}
              aria-label={
                kind === "project" ? "New project name" : "New issue title"
              }
              onChange={(event) => setTitle(event.target.value)}
            />
            {kind === "issue" ? (
              <TaskDescriptionEditor
                ref={descriptionRef}
                documentId="new-issue"
                body=""
                ariaLabel="Issue description"
                compact
              />
            ) : null}
            <div className="copper-task-property-row">
              {kind === "issue" ? (
                <>
                  <TaskSelectMenu
                    label="Issue status"
                    value={status}
                    options={statusOptions}
                    icon={<Gauge size={13} />}
                    onChange={setStatus}
                  />
                  <TaskSelectMenu
                    label="Issue priority"
                    value={priority}
                    options={TASK_PRIORITY_OPTIONS}
                    onChange={setPriority}
                  />
                  <TaskSelectMenu
                    label="Issue project"
                    value={project}
                    options={[
                      {
                        value: "",
                        label: "No project",
                        icon: <ProjectIcon name="folder" size={13} />,
                      },
                      ...activeProjects(projects).map((item) => ({
                        value: item.id,
                        label: item.title,
                        icon: <ProjectIcon name={item.icon} size={13} />,
                      })),
                    ]}
                    onChange={(nextProject) => {
                      setProject(nextProject);
                      const owner = projects.find(
                        (item) => item.id === nextProject,
                      );
                      if (!validStatusForProject(status, owner))
                        setStatus("todo");
                    }}
                  />
                  <TaskTextPopover
                    label="Issue labels"
                    value={labels}
                    placeholder="bug, ui"
                    onChange={setLabels}
                  />
                  <TaskDatePopover
                    label="Due date"
                    value={due}
                    onChange={setDue}
                  />
                </>
              ) : (
                <>
                  <TaskSelectMenu
                    label="Project status"
                    value={projectStatus}
                    options={PROJECT_STATUS_OPTIONS}
                    onChange={setProjectStatus}
                  />
                  <TaskTextPopover
                    label="Project labels"
                    value={labels}
                    placeholder="app, launch"
                    onChange={setLabels}
                  />
                  <TaskDatePopover
                    label="Start date"
                    value={start}
                    onChange={setStart}
                  />
                  <TaskDatePopover
                    label="Target date"
                    value={target}
                    onChange={setTarget}
                  />
                </>
              )}
            </div>
            <TaskMutationError message={error} />
            <footer className="copper-task-create-actions">
              <Dialog.Close asChild>
                <button type="button" className="copper-text-button">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="copper-task-primary"
                disabled={!title.trim() || saving}
              >
                {saving ? "Creating…" : `Create ${kind}`}
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
