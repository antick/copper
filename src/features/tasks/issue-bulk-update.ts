import { useCallback, useState } from "react";
import type { UpdateIssueInput } from "@/lib/copper/tasks";

export async function updateIssuesWithFailures(
  ids: string[],
  input: UpdateIssueInput,
  update: (id: string, input: UpdateIssueInput) => Promise<unknown>,
) {
  const results = await Promise.allSettled(ids.map((id) => update(id, input)));
  return ids.filter((_, index) => results[index]?.status === "rejected");
}

export function useIssueBulkUpdate(
  update: (id: string, input: UpdateIssueInput) => Promise<unknown>,
) {
  const [failure, setFailure] = useState<{
    ids: string[];
    input: UpdateIssueInput;
  } | null>(null);
  const updateIssues = useCallback(
    async (ids: string[], input: UpdateIssueInput) => {
      setFailure(null);
      const failed = await updateIssuesWithFailures(ids, input, update);
      if (failed.length) setFailure({ ids: failed, input });
    },
    [update],
  );
  return { failure, updateIssues };
}
