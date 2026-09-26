import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProjectAction } from "@/features/tasks/project-context-menu";
import { ProjectIconPicker } from "@/features/tasks/project-icon-picker";
import { DEFAULT_PROJECT_ICON } from "@/features/tasks/project-icons";
import { TaskMutationError } from "@/features/tasks/task-ui";
import type { TaskProject } from "@/lib/copper/tasks";

const ACTION_LABELS: Record<ProjectAction, string> = {
  rename: "Rename project",
  icon: "Change project icon",
  archive: "Archive project",
  delete: "Delete project",
};

export function ProjectActionDialog({
  action,
  project,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  action: ProjectAction;
  project: TaskProject;
  error?: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (value?: string) => void;
}) {
  const [value, setValue] = useState(
    action === "rename"
      ? project.title
      : (project.icon ?? DEFAULT_PROJECT_ICON),
  );
  useEffect(() => {
    setValue(
      action === "rename"
        ? project.title
        : (project.icon ?? DEFAULT_PROJECT_ICON),
    );
  }, [action, project]);
  const destructive = action === "archive" || action === "delete";
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="copper-task-dialog-overlay" />
        <Dialog.Content
          className="copper-task-management-dialog"
          aria-describedby={undefined}
        >
          <header className="copper-task-composer-header">
            <Dialog.Title>{ACTION_LABELS[action]}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="copper-icon-button"
                aria-label="Close"
                type="button"
              >
                <X size={16} aria-hidden />
              </button>
            </Dialog.Close>
          </header>
          {action === "rename" ? (
            <input
              autoFocus
              className="copper-task-composer-title"
              aria-label="Project name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          ) : action === "icon" ? (
            <ProjectIconPicker value={value} onChange={setValue} />
          ) : (
            <p className="copper-task-confirm-copy">
              {action === "archive"
                ? `Archive ${project.title}? Its issues remain available in All issues.`
                : `Delete ${project.title}? The project moves to Trash and its issues become unscoped.`}
            </p>
          )}
          <TaskMutationError message={error} />
          <footer className="copper-task-create-actions">
            <button
              type="button"
              className="copper-text-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={
                destructive ? "copper-task-danger" : "copper-task-primary"
              }
              disabled={saving || (action === "rename" && !value.trim())}
              onClick={() => onSubmit(value.trim())}
            >
              {saving ? "Saving…" : ACTION_LABELS[action]}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
