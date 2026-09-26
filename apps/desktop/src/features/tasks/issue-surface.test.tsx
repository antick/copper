import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IssueSurface } from "@/features/tasks/issue-surface";
import type { TaskIssue } from "@/lib/copper/tasks";

const issue = (id: string, title: string): TaskIssue => ({
  path: `${id}.md`,
  id,
  title,
  status: "todo",
  priority: "none",
  project: null,
  labels: [],
  due: null,
  rank: id,
  created: "",
  updated: "",
});

const unused = vi.fn();

describe("IssueSurface", () => {
  it("hides non-matching kanban cards when searching", () => {
    render(
      <TooltipProvider>
        <IssueSurface
          title="All issues"
          view="board"
          issues={[issue("COPP-1", "Fast board"), issue("COPP-2", "Other")]}
          projects={[]}
          project={null}
          pending={false}
          error={false}
          mutationError={null}
          onRetryMutation={unused}
          filter="all"
          groupBy="none"
          sort="rank"
          query="fast"
          visibleProperties={new Set()}
          selectedIds={new Set()}
          onRetry={unused}
          onSearch={unused}
          onFilter={unused}
          onOpenIssue={unused}
          onFocusIssue={unused}
          onToggleIssue={unused}
          onRangeIssue={unused}
          onContextIssue={unused}
          onUpdateIssues={unused}
          onEditLabels={unused}
          columnWidths={{}}
          onColumnWidthsChange={unused}
          onMove={unused}
          onMoveRejected={unused}
          onNewIssue={unused}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("Fast board")).toBeInTheDocument();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "In Progress" })).toBeVisible();
  });
});
