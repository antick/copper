import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TaskMutationError, TaskSelectMenu } from "@/features/tasks/task-ui";
import { DEFAULT_WORKFLOW } from "@/features/tasks/workflow";
import type { TaskWorkflowColumn, WorkflowCategory } from "@/lib/copper/tasks";

export type WorkflowAction = "add" | "rename" | "archive";

const CATEGORY_OPTIONS: Array<{ value: WorkflowCategory; label: string }> = [
  { value: "unstarted", label: "Unstarted" },
  { value: "started", label: "Started" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];
const PROTECTED_NAMES = new Set([
  "backlog",
  ...DEFAULT_WORKFLOW.map(({ label }) => label.toLowerCase()),
]);

export function workflowNameError(
  label: string,
  workflow: TaskWorkflowColumn[],
  column?: TaskWorkflowColumn,
) {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return "Enter a column name.";
  const unchanged = normalized === column?.label.trim().toLowerCase();
  if (PROTECTED_NAMES.has(normalized) && !unchanged) {
    return "That name is reserved for a built-in status.";
  }
  if (
    workflow.some(
      (item) =>
        item.id !== column?.id &&
        item.label.trim().toLowerCase() === normalized,
    )
  ) {
    return "A column with that name already exists.";
  }
  return null;
}

export function WorkflowDialog({
  action,
  column,
  workflow,
  issueCount,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  action: WorkflowAction;
  column?: TaskWorkflowColumn;
  workflow: TaskWorkflowColumn[];
  issueCount: number;
  error?: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (value: {
    label: string;
    category: WorkflowCategory;
    fallbackStatusId?: string;
  }) => void;
}) {
  const [label, setLabel] = useState(column?.label ?? "");
  const [category, setCategory] = useState<WorkflowCategory>(
    column?.category ?? "started",
  );
  const fallbacks = useMemo(
    () => workflow.filter((item) => item.id !== column?.id),
    [column?.id, workflow],
  );
  const [fallback, setFallback] = useState(fallbacks[0]?.id ?? "todo");
  useEffect(() => {
    setLabel(column?.label ?? "");
    setCategory(column?.category ?? "started");
    setFallback(fallbacks[0]?.id ?? "todo");
  }, [column, fallbacks]);
  const nameError =
    action === "archive" ? null : workflowNameError(label, workflow, column);
  const title =
    action === "add"
      ? "Add workflow column"
      : action === "rename"
        ? `Edit ${column?.label ?? "column"}`
        : `Archive ${column?.label ?? "column"}`;
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="copper-task-dialog-overlay" />
        <Dialog.Content
          className="copper-task-management-dialog"
          aria-describedby={undefined}
        >
          <header className="copper-task-composer-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="copper-icon-button"
                aria-label="Close"
              >
                <X size={16} aria-hidden />
              </button>
            </Dialog.Close>
          </header>
          {action === "archive" ? (
            <div className="copper-task-dialog-body">
              <p className="copper-task-confirm-copy">
                {issueCount
                  ? `${issueCount} issue${issueCount === 1 ? "" : "s"} must move before this column is archived.`
                  : "This column has no issues and can be archived safely."}
              </p>
              {issueCount ? (
                <div className="copper-task-form-field">
                  <span>Move issues to</span>
                  <TaskSelectMenu
                    label="Move issues to"
                    value={fallback}
                    options={fallbacks.map((item) => ({
                      value: item.id,
                      label: item.label,
                    }))}
                    onChange={setFallback}
                  />
                  <small>
                    Issues keep their titles and move before archive.
                  </small>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="copper-task-dialog-body">
              <label className="copper-task-form-field">
                <span>Column name</span>
                <input
                  autoFocus
                  aria-label="Column name"
                  aria-invalid={Boolean(label && nameError)}
                  aria-describedby="workflow-name-help"
                  placeholder="QA review"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
                <small
                  id="workflow-name-help"
                  data-error={Boolean(label && nameError) || undefined}
                >
                  {label && nameError
                    ? nameError
                    : "Use a short, unique status name."}
                </small>
              </label>
              <div className="copper-task-form-field">
                <span>Category</span>
                <TaskSelectMenu
                  label="Column category"
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onChange={setCategory}
                />
                <small>
                  Category controls status color and completion behavior.
                </small>
              </div>
            </div>
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
                action === "archive"
                  ? "copper-task-danger"
                  : "copper-task-primary"
              }
              disabled={saving || Boolean(nameError)}
              onClick={() => {
                if (nameError) return;
                onSubmit({
                  label: label.trim(),
                  category,
                  fallbackStatusId: issueCount ? fallback : undefined,
                });
              }}
            >
              {saving
                ? "Saving…"
                : action === "archive"
                  ? "Archive column"
                  : "Save"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
