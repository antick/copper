import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/lib/copper", () => ({
  copper: {
    system: {
      appInfo: async () => ({
        name: "Copper",
        version: "0.1.0",
        platform: "macos",
      }),
    },
    vaults: {
      list: async () => [{ id: "abc", name: "Demo", path: "/tmp/demo" }],
      pickAndOpen: async () => null,
      openVault: async () => ({ id: "abc", name: "Demo", path: "/tmp/demo" }),
    },
    settings: {
      load: async () => ({
        theme: "system",
        fontSize: 14,
        lineHeight: 1.55,
        tabSize: 2,
        wrapping: true,
        attachmentFolder: "attachments",
      }),
    },
  },
}));

describe("IndexPage", () => {
  it("redirects to the Welcome Vault screen", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Copper" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Vault" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Recent Vaults")).toBeInTheDocument();
  });
});
