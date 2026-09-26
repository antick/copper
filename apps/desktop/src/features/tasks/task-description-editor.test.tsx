import { EditorView } from "@codemirror/view";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskDescriptionEditor } from "@/features/tasks/task-description-editor";

afterEach(() => vi.useRealTimers());

describe("TaskDescriptionEditor", () => {
  it("formats CodeMirror content and exposes save state", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => undefined);
    render(
      <TooltipProvider>
        <TaskDescriptionEditor
          documentId="ISSUE-1"
          body="hello"
          ariaLabel="Issue description"
          onSave={onSave}
        />
      </TooltipProvider>,
    );
    const content = screen.getByLabelText("Issue description");
    const view = EditorView.findFromDOM(content as HTMLElement);
    expect(view).not.toBeNull();
    view?.dispatch({ selection: { anchor: 0, head: 5 } });
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(view?.state.doc.toString()).toBe("**hello**");
    expect(screen.getByRole("status")).toHaveTextContent("Dirty");
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(onSave).toHaveBeenCalledWith("**hello**");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("retains a failed buffer and retries it", async () => {
    vi.useFakeTimers();
    const onSave = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("read only"))
      .mockResolvedValue(undefined);
    render(
      <TooltipProvider>
        <TaskDescriptionEditor
          documentId="ISSUE-2"
          body=""
          ariaLabel="Issue description"
          onSave={onSave}
        />
      </TooltipProvider>,
    );
    const view = EditorView.findFromDOM(
      screen.getByLabelText("Issue description") as HTMLElement,
    );
    view?.dispatch({ changes: { from: 0, insert: "Keep me" } });
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByRole("status")).toHaveTextContent("Save failed");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => undefined);
    expect(onSave).toHaveBeenLastCalledWith("Keep me");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});
