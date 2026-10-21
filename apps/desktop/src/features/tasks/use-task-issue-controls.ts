import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IssueFilter,
  IssueGroupBy,
  IssueSort,
} from "@/features/tasks/filter-issues";
import {
  type OpenTaskLabels,
  taskIssueFocusTarget,
} from "@/features/tasks/task-label-dialog";
import {
  TASK_VISIBLE_PROPERTIES,
  type TaskVisibleProperty,
} from "@/features/tasks/task-selectors";
import type { TaskIssue, UpdateIssueInput } from "@/lib/copper/tasks";

export function useTaskIssueControls(
  issues: TaskIssue[],
  updateIssues: (ids: string[], input: UpdateIssueInput) => Promise<string[]>,
  openLabels: OpenTaskLabels,
) {
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [groupBy, setGroupBy] = useState<IssueGroupBy>("none");
  const [sort, setSort] = useState<IssueSort>("rank");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [visibleProperties, setVisibleProperties] = useState<
    Set<TaskVisibleProperty>
  >(() => new Set(TASK_VISIBLE_PROPERTIES));
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput), 120);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const editLabels = useCallback(
    (ids: string[]) => {
      const current = issues.find((issue) => issue.id === ids[0]);
      openLabels(
        current?.labels.join(", ") ?? "",
        async (labels) => {
          const failed = await updateIssues(ids, { labels });
          if (failed.length) {
            throw new Error(
              `${failed.length} issue${failed.length === 1 ? "" : "s"} could not be updated.`,
            );
          }
        },
        current ? () => taskIssueFocusTarget(current.id) : undefined,
      );
    },
    [issues, openLabels, updateIssues],
  );

  return {
    filter,
    setFilter,
    groupBy,
    setGroupBy,
    sort,
    setSort,
    query,
    searchInput,
    setSearchInput,
    visibleProperties,
    setVisibleProperties,
    searchRef,
    editLabels,
  };
}
