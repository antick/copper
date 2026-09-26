import type { IssueCommentActions } from "@/features/tasks/issue-comments";
import { TaskDetail } from "@/features/tasks/issue-detail";
import { TaskCreateDialog } from "@/features/tasks/task-create-dialog";
import type {
  CreateIssueInput,
  CreateProjectInput,
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

export function TaskOverlays({
  issue,
  projects,
  composer,
  defaultProject,
  defaultStatus,
  onCloseIssue,
  onOpenIssueTab,
  onUpdateIssue,
  commentActions,
  onCloseComposer,
  onSubmitIssue,
  onSubmitProject,
}: {
  issue?: TaskIssue;
  projects: TaskProject[];
  composer: "issue" | "project" | null;
  defaultProject: string | null;
  defaultStatus: string;
  onCloseIssue: () => void;
  onOpenIssueTab: () => void;
  onUpdateIssue: (input: UpdateIssueInput) => Promise<unknown>;
  commentActions: IssueCommentActions;
  onCloseComposer: () => void;
  onSubmitIssue: (input: CreateIssueInput) => Promise<void>;
  onSubmitProject: (input: CreateProjectInput) => Promise<void>;
}) {
  return (
    <>
      <TaskDetail
        issue={issue}
        projects={projects}
        onClose={onCloseIssue}
        onOpenInNewTab={onOpenIssueTab}
        onUpdate={onUpdateIssue}
        commentActions={commentActions}
      />
      {composer ? (
        <TaskCreateDialog
          key={composer}
          open
          kind={composer}
          projects={projects}
          defaultProject={defaultProject}
          defaultStatus={defaultStatus}
          onOpenChange={(open) => {
            if (!open) onCloseComposer();
          }}
          onSubmitIssue={onSubmitIssue}
          onSubmitProject={onSubmitProject}
        />
      ) : null}
    </>
  );
}
