import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectIconPicker } from "@/features/tasks/project-icon-picker";
import { ProjectIcon } from "@/features/tasks/project-icons";

describe("project icon picker", () => {
  it("searches the shared symbol registry and selects without changing identity", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProjectIconPicker value="shapes" onChange={onChange} />);
    await user.type(screen.getByLabelText("Search project icons"), "rocket");
    expect(screen.queryByRole("radio", { name: "Shapes" })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Rocket" }));
    expect(onChange).toHaveBeenCalledWith("rocket");
  });

  it("renders stored emoji, migrates legacy defaults, and keeps explicit Shapes", () => {
    const { container, rerender } = render(<ProjectIcon name="emoji:🧭" />);
    expect(container).toHaveTextContent("🧭");
    rerender(<ProjectIcon name="target" />);
    expect(container.querySelector(".lucide-folder")).not.toBeNull();
    rerender(<ProjectIcon name="lucide:shapes" />);
    expect(container.querySelector(".lucide-shapes")).not.toBeNull();
  });
});
