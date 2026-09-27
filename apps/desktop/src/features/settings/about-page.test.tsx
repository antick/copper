import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/settings/advanced";

vi.mock("@/lib/copper", () => ({
  copper: {
    system: {
      appInfo: async () => ({
        name: "Copper",
        version: "0.1.0",
        platform: "macos",
      }),
    },
  },
}));

vi.mock("@/features/updates/about-updates", () => ({
  AboutUpdates: () => <div>updates</div>,
}));

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
}

describe("About & Diagnostics", () => {
  it("shows the installed version", async () => {
    const Page = Route.options.component;
    if (!Page) throw new Error("About settings route has no component");
    wrap(<Page />);

    expect(await screen.findByText("0.1.0")).toBeVisible();
    expect(screen.getByText("About & Diagnostics")).toBeVisible();
    expect(screen.getByText("Version")).toBeVisible();
    expect(screen.queryByText("License")).not.toBeInTheDocument();
    expect(screen.queryByText("Vault storage")).not.toBeInTheDocument();
    expect(screen.queryByText("Application data")).not.toBeInTheDocument();
  });
});
