import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceTopBar } from "@/components/shell/workspace-top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("WorkspaceTopBar", () => {
  it.each(["Open notes", "Open tasks"])(
    "keeps %s gaps draggable and controls interactive",
    async (tabListLabel) => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      const onActivateTab = vi.fn();
      const { container } = render(
        <TooltipProvider>
          <WorkspaceTopBar
            tabs={[{ id: "one", label: "One" }]}
            activeId="one"
            tabListLabel={tabListLabel}
            onActivateTab={onActivateTab}
            onPinTab={vi.fn()}
            onCloseTab={vi.fn()}
            canGoBack
            onBack={onBack}
          />
        </TooltipProvider>,
      );

      expect(container.firstElementChild).toHaveAttribute(
        "data-copper-drag-region",
      );
      expect(
        screen.getByRole("tablist", { name: tabListLabel }),
      ).toHaveAttribute("data-copper-drag-region");
      expect(container.querySelector(".copper-header-drag-handle")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Back" }));
      await user.click(screen.getByRole("tab", { name: /One/ }));
      expect(onBack).toHaveBeenCalledOnce();
      expect(onActivateTab).toHaveBeenCalledWith("one");
    },
  );
});
