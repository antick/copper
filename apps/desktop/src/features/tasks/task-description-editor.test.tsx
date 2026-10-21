import { EditorView } from "@codemirror/view";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskDescriptionEditor } from "@/features/tasks/task-description-editor";
import { flushOpenDocuments } from "@/lib/copper/events";

afterEach(() => vi.useRealTimers());

describe("TaskDescriptionEditor", () => {
  it("formats CodeMirror content and exposes save state", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => undefined);
    render(
      <TooltipProvider>
        <TaskDescriptionEditor
          vaultId="test-vault"
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
          vaultId="test-vault"
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

  it("flushes only the requested Vault's task description", async () => {
    vi.useFakeTimers();
    const saveA = vi.fn(async () => undefined);
    const saveB = vi.fn(async () => undefined);
    render(
      <TooltipProvider>
        <TaskDescriptionEditor
          vaultId="vault-a"
          documentId="ISSUE-1"
          body=""
          ariaLabel="Vault A description"
          onSave={saveA}
        />
        <TaskDescriptionEditor
          vaultId="vault-b"
          documentId="ISSUE-1"
          body=""
          ariaLabel="Vault B description"
          onSave={saveB}
        />
      </TooltipProvider>,
    );
    const editorA = EditorView.findFromDOM(
      screen.getByLabelText("Vault A description") as HTMLElement,
    );
    const editorB = EditorView.findFromDOM(
      screen.getByLabelText("Vault B description") as HTMLElement,
    );
    editorA?.dispatch({ changes: { from: 0, insert: "A" } });
    editorB?.dispatch({ changes: { from: 0, insert: "B" } });

    await act(() => flushOpenDocuments("vault-b"));

    expect(saveA).not.toHaveBeenCalled();
    expect(saveB).toHaveBeenCalledWith("B");
  });

  it("resets the editor body when the same task id moves to another Vault", async () => {
    const saveA = vi.fn(async () => undefined);
    const saveB = vi.fn(async () => undefined);
    const node = (vaultId: string, body: string, onSave: typeof saveA) => (
      <TooltipProvider>
        <TaskDescriptionEditor
          vaultId={vaultId}
          documentId="ISSUE-1"
          body={body}
          ariaLabel="Issue description"
          onSave={onSave}
        />
      </TooltipProvider>
    );
    const result = render(node("vault-a", "A private body", saveA));
    const editorA = EditorView.findFromDOM(
      screen.getByLabelText("Issue description") as HTMLElement,
    );
    act(() =>
      editorA?.dispatch({
        changes: {
          from: 0,
          to: editorA.state.doc.length,
          insert: "A pending update",
        },
      }),
    );
    result.rerender(node("vault-b", "B private body", saveB));
    const editorB = EditorView.findFromDOM(
      screen.getByLabelText("Issue description") as HTMLElement,
    );

    expect(saveA).toHaveBeenCalledWith("A pending update");
    expect(saveB).not.toHaveBeenCalled();
    expect(editorB?.state.doc.toString()).toBe("B private body");
    act(() =>
      editorB?.dispatch({
        changes: {
          from: 0,
          to: editorB.state.doc.length,
          insert: "B update",
        },
      }),
    );
    await act(() => flushOpenDocuments("vault-b"));

    expect(saveA).toHaveBeenCalledTimes(1);
    expect(saveA).toHaveBeenCalledWith("A pending update");
    expect(saveB).toHaveBeenCalledWith("B update");
  });

  it("keeps pending saves with their document when an editor switches issues", async () => {
    const saveIssue1 = vi.fn(async () => undefined);
    const saveIssue2 = vi.fn(async () => undefined);
    const node = (
      documentId: string,
      body: string,
      onSave: typeof saveIssue1,
    ) => (
      <TooltipProvider>
        <TaskDescriptionEditor
          vaultId="vault-a"
          documentId={documentId}
          body={body}
          ariaLabel="Issue description"
          onSave={onSave}
        />
      </TooltipProvider>
    );
    const result = render(node("ISSUE-1", "Issue 1 body", saveIssue1));
    const editor1 = EditorView.findFromDOM(
      screen.getByLabelText("Issue description") as HTMLElement,
    );
    act(() =>
      editor1?.dispatch({
        changes: {
          from: 0,
          to: editor1.state.doc.length,
          insert: "Issue 1 pending update",
        },
      }),
    );

    result.rerender(node("ISSUE-2", "Issue 2 body", saveIssue2));
    const editor2 = EditorView.findFromDOM(
      screen.getByLabelText("Issue description") as HTMLElement,
    );

    expect(saveIssue1).toHaveBeenCalledWith("Issue 1 pending update");
    expect(saveIssue2).not.toHaveBeenCalled();
    expect(editor2?.state.doc.toString()).toBe("Issue 2 body");
    act(() =>
      editor2?.dispatch({
        changes: {
          from: 0,
          to: editor2.state.doc.length,
          insert: "Issue 2 update",
        },
      }),
    );
    await act(() => flushOpenDocuments("vault-a"));

    expect(saveIssue1).toHaveBeenCalledTimes(1);
    expect(saveIssue2).toHaveBeenCalledWith("Issue 2 update");
  });

  it("does not retain an invisible failed queue after unmount", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => {
      throw new Error("Disk full");
    });
    const result = render(
      <TooltipProvider>
        <TaskDescriptionEditor
          vaultId="orphan-vault"
          documentId="ISSUE-ORPHAN"
          body=""
          ariaLabel="Orphan description"
          onSave={onSave}
        />
      </TooltipProvider>,
    );
    const editor = EditorView.findFromDOM(
      screen.getByLabelText("Orphan description") as HTMLElement,
    );
    editor?.dispatch({ changes: { from: 0, insert: "Keep this visible" } });
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByRole("status")).toHaveTextContent("Save failed");

    result.unmount();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const attemptsAtUnmount = onSave.mock.calls.length;

    await act(() => flushOpenDocuments("orphan-vault"));

    expect(onSave).toHaveBeenCalledTimes(attemptsAtUnmount);
  });
});
