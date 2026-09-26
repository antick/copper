import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BOARD_VIRTUALIZE_AFTER } from "@/features/tasks/constants";
import { IssueBoard, moveInputForDrop } from "@/features/tasks/issue-board";
import { boardKeyboardCoordinates } from "@/features/tasks/issue-board-dnd";
import type { TaskIssue, TaskProject } from "@/lib/copper/tasks";

const issues: TaskIssue[] = [
  issue("COPP-1", "todo", "A"),
  issue("COPP-2", "todo", "B"),
  issue("COPP-3", "in_progress", "C"),
];

describe("IssueBoard", () => {
  it("calculates same-column and cross-column placement", () => {
    expect(moveInputForDrop(issues, "COPP-2", "COPP-1")).toEqual({
      status: "todo",
      afterId: null,
      beforeId: "COPP-1",
    });
    expect(moveInputForDrop(issues, "COPP-1", "COPP-2")).toEqual({
      status: "todo",
      afterId: "COPP-2",
    });
    expect(moveInputForDrop(issues, "COPP-1", "COPP-1")).toBeNull();
    expect(moveInputForDrop(issues, "COPP-1", "column:in_progress")).toEqual({
      status: "in_progress",
      afterId: "COPP-3",
    });
  });

  it("moves keyboard drags to the adjacent visible lane", () => {
    const preventDefault = vi.fn();
    const lane = (id: string, left: number) => ({
      id,
      data: { current: { type: "issue-lane", status: id } },
      left,
    });
    const todo = lane("todo", 0);
    const progress = lane("in_progress", 326);
    const rect = (left: number) => ({
      left,
      right: left + 312,
      top: 0,
      bottom: 600,
      width: 312,
      height: 600,
    });
    expect(
      boardKeyboardCoordinates(
        { code: "ArrowRight", preventDefault } as unknown as KeyboardEvent,
        {
          currentCoordinates: { x: 12, y: 80 },
          context: {
            active: { data: { current: { status: "todo" } } },
            collisionRect: rect(12),
            droppableContainers: { getEnabled: () => [todo, progress] },
            droppableRects: new Map([
              [todo.id, rect(0)],
              [progress.id, rect(326)],
            ]),
          },
        } as never,
      ),
    ).toEqual({ x: 326, y: 0 });
    expect(preventDefault).toHaveBeenCalled();
  });

  it("renders full issue metadata and accessible columns", () => {
    render(
      <IssueBoard
        issues={issues}
        project={null}
        projects={[]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Todo" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Canceled" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New Canceled issue" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("High")).toHaveLength(3);
    expect(screen.getAllByText("UI")).toHaveLength(3);
    expect(screen.getAllByText("Copper")).toHaveLength(3);
    expect(screen.getAllByText("Sep 8, 2026")).toHaveLength(3);
  });

  it("exposes a native horizontal board and maps nested wheels to it", () => {
    render(
      <IssueBoard
        issues={issues}
        project={null}
        projects={[]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    const board = screen.getByRole("region", { name: "Kanban board" });
    const lane = screen.getByRole("region", { name: "Todo" });
    expect(board).toHaveAttribute("tabindex", "0");
    expect(board.querySelector(".copper-task-board-track")).not.toBeNull();
    expect(lane.querySelector(".copper-task-column-body")).not.toHaveClass(
      "copper-scroll",
    );
    Object.defineProperty(board, "scrollWidth", {
      configurable: true,
      value: 1800,
    });
    Object.defineProperty(board, "clientWidth", {
      configurable: true,
      value: 800,
    });

    fireEvent.wheel(lane, { deltaX: 90, deltaY: 8 });
    expect(board.scrollLeft).toBe(90);
    fireEvent.wheel(lane, { shiftKey: true, deltaY: 30 });
    expect(board.scrollLeft).toBe(120);
    fireEvent.wheel(lane, { deltaX: 4, deltaY: 80 });
    expect(board.scrollLeft).toBe(120);

    fireEvent.keyDown(board, { key: "ArrowRight" });
    expect(board.scrollLeft).toBe(400);
    fireEvent.keyDown(board, { key: "ArrowLeft" });
    expect(board.scrollLeft).toBe(120);
    fireEvent.keyDown(board, { key: "End" });
    expect(board.scrollLeft).toBe(1800);
    fireEvent.keyDown(board, { key: "Home" });
    expect(board.scrollLeft).toBe(0);
  });

  it("keeps readable columns and removes motion when requested", () => {
    const css = ["tasks.css", "task-surfaces.css", "tasks-responsive.css"]
      .map((file) =>
        readFileSync(resolve(process.cwd(), "src/styles", file), "utf8"),
      )
      .join("\n");
    expect(css).toMatch(/--tasks-column-min: 312px/);
    expect(css).toMatch(/\.copper-task-board \{[\s\S]*?display: flex;/);
    expect(css).toMatch(
      /\.copper-task-board \{[\s\S]*?overflow-x: auto;[\s\S]*?scrollbar-gutter: stable;/,
    );
    expect(css).toMatch(
      /\.copper-task-board-track \{[\s\S]*?width: max-content;/,
    );
    expect(css).toMatch(
      /\.copper-task-column-body \{[\s\S]*?overflow-x: hidden;[\s\S]*?overscroll-behavior-x: auto;/,
    );
    expect(css).toContain(".copper-task-board::-webkit-scrollbar-thumb");
    expect(css).toMatch(/\.copper-task-board-action \{[\s\S]*?height: 32px;/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none/,
    );
    expect(css).toMatch(
      /\.copper-task-card\[data-dragging="true"\] \{[\s\S]*?opacity: 0;[\s\S]*?transition: none;/,
    );
    expect(css).not.toMatch(
      /\.copper-task-card \{[\s\S]*?transition:\s*transform var\(--tasks-motion-fast\)/,
    );
    expect(css).toMatch(/\.copper-task-drop-slot \{[\s\S]*?dashed/);
    expect(css).toContain("--tasks-drop-slot-min-height: 96px;");
    expect(css).toMatch(/\.copper-task-card-overlay \{[\s\S]*?rotate: 4deg;/);
    expect(css).not.toContain("inset 0 2px var(--accent)");
  });

  it("renders project custom columns and the add-column affordance", () => {
    const project: TaskProject = {
      path: "Tasks/Projects/copper.md",
      id: "copper",
      title: "Copper",
      status: "started",
      labels: [],
      start: null,
      target: null,
      workflow: [
        { id: "todo", label: "Todo", category: "unstarted" },
        { id: "copper--review", label: "Review", category: "started" },
        { id: "in_progress", label: "In Progress", category: "started" },
        { id: "done", label: "Done", category: "completed" },
        { id: "canceled", label: "Canceled", category: "canceled" },
      ],
      counts: {
        backlog: 0,
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
        canceled: 0,
      },
    };
    const { unmount } = render(
      <IssueBoard
        issues={[]}
        project="copper"
        projects={[project]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
        onAddColumn={vi.fn()}
        onRenameColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Review" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add column" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage Review column" }),
    ).toBeInTheDocument();

    unmount();
    render(
      <IssueBoard
        issues={[
          { ...issues[0], project: project.id, status: "copper--review" },
        ]}
        project={null}
        projects={[project]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Review" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage Review column" }),
    ).not.toBeInTheDocument();
  });

  it("hides populated columns and restores them without exposing a drop lane", async () => {
    const user = userEvent.setup();
    const project: TaskProject = {
      path: "Tasks/Projects/copper.md",
      id: "copper",
      title: "Copper",
      status: "started",
      labels: [],
      start: null,
      target: null,
      workflow: [
        { id: "todo", label: "Todo", category: "unstarted" },
        { id: "in_progress", label: "In Progress", category: "started" },
        {
          id: "in_review",
          label: "In Review",
          category: "started",
          hidden: true,
        },
        { id: "done", label: "Done", category: "completed" },
        { id: "canceled", label: "Canceled", category: "canceled" },
      ],
      counts: {
        backlog: 0,
        todo: 0,
        in_progress: 0,
        in_review: 1,
        done: 0,
        canceled: 0,
      },
    };
    const onShowColumn = vi.fn();
    const onHideColumn = vi.fn();
    render(
      <IssueBoard
        issues={[{ ...issues[0], project: project.id, status: "in_review" }]}
        project={project.id}
        projects={[project]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
        onMoveColumn={vi.fn()}
        onHideColumn={onHideColumn}
        onShowColumn={onShowColumn}
      />,
    );
    expect(screen.queryByRole("region", { name: "In Review" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show columns" }));
    await user.click(screen.getByRole("menuitem", { name: /In Review/ }));
    expect(onShowColumn).toHaveBeenCalledWith(
      expect.objectContaining({ id: "in_review", hidden: true }),
    );
    await user.click(
      screen.getByRole("button", { name: "Manage Todo column" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Hide column" }));
    expect(onHideColumn).toHaveBeenCalledWith(
      expect.objectContaining({ id: "todo" }),
    );
  });

  it("shows an overlay and announces keyboard drag and cancel", async () => {
    const user = userEvent.setup();
    render(
      <IssueBoard
        issues={issues}
        project={null}
        projects={[]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    const liveRegion = await screen.findByRole("status");
    const source = screen.getByRole("button", { name: /COPP-1/ });
    source.focus();
    await user.keyboard(" ");
    await waitFor(() =>
      expect(liveRegion).toHaveTextContent("Issue is over COPP-1."),
    );
    expect(source).toHaveAttribute("data-dragging", "true");
    expect(document.querySelector(".copper-task-card-overlay")).not.toBeNull();
    expect(document.querySelector(".copper-task-drop-slot")).toBeNull();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(document.querySelector(".copper-task-card-overlay")).toBeNull(),
    );
    expect(source).not.toHaveAttribute("data-dragging");
    expect(liveRegion).toHaveTextContent("Move canceled for COPP-1.");
  });

  it("switches large columns to virtualized geometry", () => {
    render(
      <IssueBoard
        issues={Array.from({ length: BOARD_VIRTUALIZE_AFTER + 1 }, (_, index) =>
          issue(`COPP-${index + 1}`, "todo", String(index)),
        )}
        project={null}
        projects={[]}
        selectedIds={new Set()}
        onOpen={vi.fn()}
        onFocus={vi.fn()}
        onToggle={vi.fn()}
        onRange={vi.fn()}
        onContext={vi.fn()}
        onUpdate={vi.fn()}
        onEditLabels={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    expect(
      screen
        .getByRole("region", { name: "Todo" })
        .querySelector(".copper-task-column-cards"),
    ).toHaveStyle({ position: "relative" });
  });
});

function issue(
  id: string,
  status: TaskIssue["status"],
  rank: string,
): TaskIssue {
  return {
    path: `Tasks/Issues/${id}.md`,
    id,
    title: `Issue ${id}`,
    status,
    priority: "high",
    project: "Copper",
    labels: ["UI"],
    due: "2026-09-08",
    rank,
    created: "2026-08-01",
    updated: "2026-08-01",
    body: "",
  };
}
