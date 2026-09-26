import { TaskIssueToolbar } from "@/features/tasks/task-workspace-chrome";
import type { useTaskIssueControls } from "@/features/tasks/use-task-issue-controls";
import type { TasksView } from "@/lib/copper/settings";

export function TaskWorkspaceIssueToolbar({
  controls,
  view,
  onViewChange,
}: {
  controls: ReturnType<typeof useTaskIssueControls>;
  view: TasksView;
  onViewChange: (view: TasksView) => void;
}) {
  return (
    <TaskIssueToolbar
      searchRef={controls.searchRef}
      query={controls.searchInput}
      filter={controls.filter}
      groupBy={controls.groupBy}
      sort={controls.sort}
      visibleProperties={controls.visibleProperties}
      view={view}
      onQueryChange={controls.setSearchInput}
      onFilterChange={controls.setFilter}
      onGroupByChange={controls.setGroupBy}
      onSortChange={controls.setSort}
      onToggleProperty={(property) =>
        controls.setVisibleProperties((current) => {
          const next = new Set(current);
          if (next.has(property)) next.delete(property);
          else next.add(property);
          return next;
        })
      }
      onViewChange={onViewChange}
    />
  );
}
