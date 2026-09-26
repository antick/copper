import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityRail } from "@/components/shell/activity-rail";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ActivityRail", () => {
  it("uses a balanced 16px notebook glyph for Notes", () => {
    render(
      <TooltipProvider>
        <ActivityRail onOpenVault={vi.fn()} onOpenSettings={vi.fn()} />
      </TooltipProvider>,
    );
    const icon = screen
      .getByRole("button", { name: "Notes" })
      .querySelector("svg");
    expect(icon).toHaveClass("lucide-notebook-pen");
    expect(icon).toHaveAttribute("width", "16");
    expect(icon).toHaveAttribute("height", "16");
  });
});
