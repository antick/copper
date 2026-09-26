import type { IssueCommentActions } from "@/features/tasks/issue-comments";
import {
  useAddIssueComment,
  useDeleteIssueComment,
  useUpdateIssueComment,
} from "@/features/tasks/queries";

export function useIssueCommentActions(vaultId: string) {
  const add = useAddIssueComment(vaultId);
  const update = useUpdateIssueComment(vaultId);
  const remove = useDeleteIssueComment(vaultId);

  return (issueId: string | null): IssueCommentActions => ({
    add: (body) =>
      issueId ? add.mutateAsync({ id: issueId, body }) : Promise.resolve(),
    update: (commentId, body) =>
      issueId
        ? update.mutateAsync({ id: issueId, commentId, body })
        : Promise.resolve(),
    delete: (commentId) =>
      issueId
        ? remove.mutateAsync({ id: issueId, commentId })
        : Promise.resolve(),
  });
}
