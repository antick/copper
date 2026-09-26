import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TabStrip, tabDropEdge } from "@/features/tabs/tab-strip";

describe("TabStrip", () => {
  it("picks the insert edge from the pointer midpoint", () => {
    const rect = { left: 40, width: 80 };
    expect(tabDropEdge(50, rect)).toBe("before");
    expect(tabDropEdge(110, rect)).toBe("after");
  });

  it("keeps an empty drag strip for the editor header", () => {
    const { container } = render(
      <TabStrip
        tabs={[]}
        onActivate={vi.fn()}
        onPin={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("tablist", { name: "Open notes" })).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(container.querySelector(".copper-tab-strip")).toHaveAttribute(
      "data-copper-drag-region",
    );
  });

  it("renders a single italic preview and pins it on double-click", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onPin = vi.fn();
    render(
      <TabStrip
        tabs={[{ id: "Notes/preview.md", label: "preview.md", preview: true }]}
        activeId="Notes/preview.md"
        onActivate={onActivate}
        onPin={onPin}
        onClose={vi.fn()}
      />,
    );

    const tab = screen.getByRole("tab", { name: /preview\.md/i });
    expect(tab).toHaveAttribute("data-preview", "true");
    await user.dblClick(tab);
    expect(onActivate).toHaveBeenCalled();
    expect(onPin).toHaveBeenCalledWith("Notes/preview.md");
  });

  it("activates from the keyboard and closes without pinning", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onPin = vi.fn();
    const onClose = vi.fn();
    render(
      <TabStrip
        tabs={[
          { id: "a.md", label: "a.md", preview: false },
          { id: "b.md", label: "b.md", preview: true },
        ]}
        activeId="a.md"
        onActivate={onActivate}
        onPin={onPin}
        onClose={onClose}
      />,
    );

    const second = screen.getByRole("tab", { name: /b\.md/i });
    second.focus();
    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledWith("b.md");

    const close = second.querySelector<HTMLElement>("[data-tab-close]");
    if (!close) throw new Error("Close target was not rendered");
    await user.click(close);
    expect(onClose).toHaveBeenCalledWith("b.md");
    expect(onPin).not.toHaveBeenCalled();
  });

  it("reorders tabs with pointer drag and Alt+Arrow", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(
      <TabStrip
        tabs={[
          { id: "a.md", label: "a.md" },
          { id: "b.md", label: "b.md" },
        ]}
        activeId="a.md"
        onActivate={vi.fn()}
        onPin={vi.fn()}
        onClose={vi.fn()}
        onReorder={onReorder}
      />,
    );

    const [first, second] = screen.getAllByRole("tab");
    fireEvent.dragStart(first);
    fireEvent.dragOver(second, { clientX: 8 });
    expect(second).toHaveAttribute("data-drop-edge");
    fireEvent.drop(second);
    expect(onReorder).toHaveBeenCalledWith(0, 1);
    expect(second).not.toHaveAttribute("data-drop-edge");

    second.focus();
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(onReorder).toHaveBeenCalledWith(1, 0);
  });
});
