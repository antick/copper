import { useTaskLabelDialog } from "@/features/tasks/task-label-dialog";
import { useTaskIssueControls } from "@/features/tasks/use-task-issue-controls";
import type { TaskIssue, UpdateIssueInput } from "@/lib/copper/tasks";

export function useTaskWorkspaceIssueControls(
  issues: TaskIssue[],
  updateIssues: (ids: string[], input: UpdateIssueInput) => Promise<string[]>,
) {
  const labels = useTaskLabelDialog();
  const controls = useTaskIssueControls(
    issues,
    updateIssues,
    labels.openLabels,
  );
  return {
    controls,
    labelDialog: labels.dialog,
    openLabels: labels.openLabels,
  };
}
