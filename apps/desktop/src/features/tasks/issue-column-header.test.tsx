import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IssueColumnHeader } from "@/features/tasks/issue-column-header";

function renderHeader(width = 96) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  render(
    <table>
      <thead>
        <tr>
          <IssueColumnHeader
            id="id"
            label="Id"
            width={width}
            onChange={onChange}
            onReset={onReset}
          />
        </tr>
      </thead>
    </table>,
  );
  return { onChange, onReset };
}

describe("IssueColumnHeader", () => {
  it("resizes by keyboard with bounded value semantics", () => {
    const { onChange } = renderHeader();
    const handle = screen.getByRole("separator", {
      name: "Resize Id column",
    });
    expect(handle).toHaveAttribute("aria-valuenow", "96");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(104);
  });

  it("resets from the keyboard or a double click", () => {
    const { onReset } = renderHeader();
    const handle = screen.getByRole("separator");
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.doubleClick(handle);
    expect(onReset).toHaveBeenCalledTimes(2);
  });
});
