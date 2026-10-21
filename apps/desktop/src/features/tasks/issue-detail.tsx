import * as Dialog from "@radix-ui/react-dialog";
import type { IssueCommentActions } from "@/features/tasks/issue-comments";
import { IssueView } from "@/features/tasks/issue-view";
import type {
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

export function TaskDetail({
  vaultId,
  issue,
  projects,
  onClose,
  onOpenInNewTab,
  onUpdate,
  commentActions,
}: {
  vaultId: string;
  issue?: TaskIssue;
  projects: TaskProject[];
  onClose: () => void;
  onOpenInNewTab: () => void;
  onUpdate: (input: UpdateIssueInput) => Promise<unknown>;
  commentActions: IssueCommentActions;
}) {
  return (
    <Dialog.Root
      open={Boolean(issue)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="copper-task-detail-overlay" />
        {issue ? (
          <Dialog.Content
            className="copper-task-detail"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">{issue.title}</Dialog.Title>
            <IssueView
              vaultId={vaultId}
              issue={issue}
              projects={projects}
              variant="peek"
              onClose={onClose}
              onOpenInNewTab={onOpenInNewTab}
              onUpdate={onUpdate}
              commentActions={commentActions}
            />
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
