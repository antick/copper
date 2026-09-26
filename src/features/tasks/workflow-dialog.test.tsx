import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WORKFLOW } from "@/features/tasks/workflow";
import {
  WorkflowDialog,
  workflowNameError,
} from "@/features/tasks/workflow-dialog";

describe("WorkflowDialog", () => {
  it("validates protected and duplicate names before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const workflow = [
      ...DEFAULT_WORKFLOW,
      { id: "copper--qa", label: "QA", category: "started" as const },
    ];
    render(
      <WorkflowDialog
        action="add"
        workflow={workflow}
        issueCount={0}
        saving={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    const name = screen.getByLabelText("Column name");
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("placeholder", "QA review");
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await user.type(name, "Todo");
    expect(screen.getByText(/reserved for a built-in status/)).toBeVisible();
    await user.clear(name);
    await user.type(name, "QA");
    expect(screen.getByText(/already exists/)).toBeVisible();
    await user.clear(name);
    await user.type(name, "Verification");
    await user.click(save);
    expect(onSubmit).toHaveBeenCalledWith({
      label: "Verification",
      category: "started",
      fallbackStatusId: undefined,
    });
  });

  it("retains archive fallback safety and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <WorkflowDialog
        action="archive"
        column={DEFAULT_WORKFLOW[2]}
        workflow={DEFAULT_WORKFLOW}
        issueCount={2}
        saving={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Move issues to" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Archive column" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackStatusId: "todo" }),
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("reports normalized naming conflicts", () => {
    expect(workflowNameError(" in progress ", DEFAULT_WORKFLOW)).toMatch(
      /reserved/,
    );
    expect(
      workflowNameError("qa", [
        ...DEFAULT_WORKFLOW,
        { id: "x--qa", label: "QA", category: "started" },
      ]),
    ).toMatch(/already exists/);
  });
});
