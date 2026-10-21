import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { expect, it, vi } from "vitest";
import { useTaskLabelDialog } from "@/features/tasks/task-label-dialog";

function LabelDialogHarness({
  onSave,
}: {
  onSave: (labels: string[]) => Promise<unknown>;
}) {
  const labels = useTaskLabelDialog();
  const returnTarget = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() =>
          labels.openLabels(
            "design, launch",
            onSave,
            () => returnTarget.current,
          )
        }
      >
        Edit labels
      </button>
      <button ref={returnTarget} type="button">
        Issue row
      </button>
      {labels.dialog}
    </>
  );
}

it("starts with current labels, parses edits, and returns focus on cancel", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn(async () => undefined);
  render(<LabelDialogHarness onSave={onSave} />);
  const opener = screen.getByRole("button", { name: "Edit labels" });
  await user.click(opener);
  expect(screen.getByRole("textbox", { name: "Labels" })).toHaveValue(
    "design, launch",
  );

  await user.keyboard("{Escape}");
  await waitFor(() => expect(opener).toHaveFocus());
  expect(onSave).not.toHaveBeenCalled();
});

it("saves cleaned labels and keeps the dialog open when saving fails", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn(async (_labels: string[]) => undefined);
  onSave.mockRejectedValueOnce(new Error("Disk is busy"));
  render(<LabelDialogHarness onSave={onSave} />);
  await user.click(screen.getByRole("button", { name: "Edit labels" }));
  const input = screen.getByRole("textbox", { name: "Labels" });
  await user.clear(input);
  await user.type(input, " first, , second ");
  await user.click(screen.getByRole("button", { name: "Save labels" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Disk is busy");
  expect(input).toHaveValue(" first, , second ");
  expect(onSave).toHaveBeenNthCalledWith(1, ["first", "second"]);

  await user.click(screen.getByRole("button", { name: "Save labels" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(onSave).toHaveBeenNthCalledWith(2, ["first", "second"]);
});
