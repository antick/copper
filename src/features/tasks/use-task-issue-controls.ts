import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IssueFilter,
  IssueGroupBy,
  IssueSort,
} from "@/features/tasks/filter-issues";
import {
  TASK_VISIBLE_PROPERTIES,
  type TaskVisibleProperty,
} from "@/features/tasks/task-selectors";
import type { TaskIssue, UpdateIssueInput } from "@/lib/copper/tasks";

export function useTaskIssueControls(
  issues: TaskIssue[],
  updateIssues: (ids: string[], input: UpdateIssueInput) => Promise<unknown>,
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
      const value = window.prompt(
        "Labels (comma separated)",
        current?.labels.join(", ") ?? "",
      );
      if (value === null) return;
      void updateIssues(ids, {
        labels: value
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
      });
    },
    [issues, updateIssues],
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
