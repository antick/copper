import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IssueComments } from "@/features/tasks/issue-comments";

const comment = {
  id: "comment-1",
  body: "Initial **Markdown**",
  created: "2026-08-30T09:00:00.000Z",
  updated: "2026-08-30T09:00:00.000Z",
};

describe("IssueComments", () => {
  it("adds, edits, and confirms deletion with keyboard-friendly controls", async () => {
    const user = userEvent.setup();
    const actions = {
      add: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    };
    render(<IssueComments comments={[comment]} actions={actions} />);
    expect(screen.getByText("Markdown", { selector: "strong" })).toBeVisible();

    const composer = screen.getByRole("textbox", { name: "New comment" });
    await user.type(composer, "New *comment*");
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(actions.add).toHaveBeenCalledWith("New *comment*");

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const editor = screen.getByRole("textbox", { name: "Edit comment" });
    await user.clear(editor);
    await user.type(editor, "Edited");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(actions.update).toHaveBeenCalledWith("comment-1", "Edited");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this comment?")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(actions.delete).toHaveBeenCalledWith("comment-1");
  });

  it("keeps a failed comment and retries the exact action", async () => {
    const user = userEvent.setup();
    const add = vi
      .fn<(_: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Comment unavailable"))
      .mockResolvedValue(undefined);
    render(
      <IssueComments
        comments={[]}
        actions={{ add, update: vi.fn(), delete: vi.fn() }}
      />,
    );
    await user.type(
      screen.getByRole("textbox", { name: "New comment" }),
      "Keep me",
    );
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Comment unavailable",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(add).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("textbox", { name: "New comment" })).toHaveValue(
      "",
    );
  });
});
