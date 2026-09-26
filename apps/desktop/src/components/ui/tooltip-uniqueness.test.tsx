import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TitleRegion } from "@/components/shell/title-region";
import { WindowNavControls } from "@/components/shell/window-nav-controls";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsLayout } from "@/features/settings/settings-layout";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
}));

describe("icon button tooltips", () => {
  it("shows one custom Close settings tooltip without a native title", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SettingsLayout>
          <div />
        </SettingsLayout>
      </TooltipProvider>,
    );

    const close = screen.getByRole("button", { name: "Close settings" });
    expect(close).not.toHaveAttribute("title");
    await user.hover(close);

    expect(
      await screen.findByRole("tooltip", { name: "Close settings" }),
    ).toBeVisible();
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(close).toHaveAccessibleName("Close settings");
  });

  it("keeps the left title toggle accessible with one custom tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <TitleRegion
          platform="macos"
          leftCollapsed={false}
          onToggleLeft={() => undefined}
        />
      </TooltipProvider>,
    );

    const hideLeft = screen.getByRole("button", { name: "Hide left sidebar" });
    expect(hideLeft).not.toHaveAttribute("title");
    expect(
      screen.queryByRole("button", { name: "Search Vault" }),
    ).not.toBeInTheDocument();
    await user.hover(hideLeft);

    expect(
      await screen.findByRole("tooltip", { name: "Hide left sidebar" }),
    ).toBeVisible();
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(hideLeft).toHaveAccessibleName("Hide left sidebar");
  });

  it("keeps shell controls accessible with one custom tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <WindowNavControls
          canGoBack
          canGoForward
          onBack={() => undefined}
          onForward={() => undefined}
          onSearch={() => undefined}
          onToggleNoteList={() => undefined}
        />
      </TooltipProvider>,
    );

    const search = screen.getByRole("button", { name: "Search Vault" });
    expect(search).not.toHaveAttribute("title");
    await user.hover(search);

    expect(
      await screen.findByRole("tooltip", { name: "Search Vault" }),
    ).toBeVisible();
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(search).toHaveAccessibleName("Search Vault");
  });
});
