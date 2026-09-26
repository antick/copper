import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VaultInfo } from "@/lib/copper/vaults";
import { routeTree } from "@/routeTree.gen";
import { WELCOME_COPY } from "./copy";

const NOTES: VaultInfo = {
  id: "notes",
  name: "notes",
  path: "/Users/example/Notes",
};

const mocks = vi.hoisted(() => ({
  list: vi.fn(async (): Promise<VaultInfo[]> => []),
  pickAndOpen: vi.fn(async (): Promise<VaultInfo | null> => null),
  openVault: vi.fn(async (_path: string): Promise<VaultInfo> => NOTES),
}));

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
      list: () => mocks.list(),
      pickAndOpen: () => mocks.pickAndOpen(),
      openVault: (path: string) => mocks.openVault(path),
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
      save: async () => undefined,
    },
  },
}));

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

describe("WelcomeScreen", () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.pickAndOpen.mockReset();
    mocks.openVault.mockReset();
    mocks.list.mockResolvedValue([]);
    mocks.pickAndOpen.mockResolvedValue(null);
    mocks.openVault.mockResolvedValue(NOTES);
  });

  it("invites opening a folder when there are no recents", async () => {
    renderAt("/welcome");

    const main = await screen.findByRole("main");
    expect(
      await screen.findByRole("heading", { name: WELCOME_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: WELCOME_COPY.openVault }),
    ).toBeInTheDocument();
    expect(screen.getByText(WELCOME_COPY.invitation)).toBeInTheDocument();
    expect(screen.queryByText("No recent Vaults yet.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: WELCOME_COPY.recentHeading }),
    ).not.toBeInTheDocument();
    expect(main).toHaveClass("copper-welcome");
    expect(main).toHaveAttribute("data-layout", "empty");
  });

  it("lists a recent Vault as a folio with name and path", async () => {
    mocks.list.mockResolvedValue([NOTES]);
    renderAt("/welcome");

    expect(
      await screen.findByRole("heading", { name: WELCOME_COPY.recentHeading }),
    ).toBeInTheDocument();
    const folio = within(screen.getByRole("list")).getByRole("button");
    expect(folio).toHaveTextContent(NOTES.name);
    expect(folio).toHaveTextContent(NOTES.path);
    expect(
      screen.getByRole("button", { name: WELCOME_COPY.openVault }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("data-layout", "recents");
    expect(
      screen.getByRole("main").querySelector(".copper-welcome-identity"),
    ).not.toBeNull();
    expect(
      screen.getByRole("region", { name: WELCOME_COPY.recentHeading }),
    ).toBeInTheDocument();
  });

  it("opens the folder picker from Open Vault and stays when cancelled", async () => {
    const { user } = renderAt("/welcome");
    await user.click(
      await screen.findByRole("button", { name: WELCOME_COPY.openVault }),
    );

    expect(mocks.pickAndOpen).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: WELCOME_COPY.heading }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert and stays on Welcome when open fails", async () => {
    mocks.pickAndOpen.mockRejectedValue(new Error("Folder is not readable."));
    const { user } = renderAt("/welcome");
    await user.click(
      await screen.findByRole("button", { name: WELCOME_COPY.openVault }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Folder is not readable.",
    );
    expect(
      screen.getByRole("heading", { name: WELCOME_COPY.heading }),
    ).toBeInTheDocument();
  });

  it("reopens a recent Vault by path", async () => {
    mocks.list.mockResolvedValue([NOTES]);
    mocks.openVault.mockRejectedValue(new Error(WELCOME_COPY.openFailed));
    const { user } = renderAt("/welcome");
    await screen.findByRole("heading", { name: WELCOME_COPY.recentHeading });
    await user.click(within(screen.getByRole("list")).getByRole("button"));

    expect(mocks.openVault).toHaveBeenCalledWith(NOTES.path);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      WELCOME_COPY.openFailed,
    );
  });

  it("opens Settings from Welcome and returns on close", async () => {
    const { user } = renderAt("/welcome");
    await user.click(
      await screen.findByRole("link", { name: WELCOME_COPY.settings }),
    );

    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close settings" }));
    expect(
      await screen.findByRole("heading", { name: WELCOME_COPY.heading }),
    ).toBeInTheDocument();
  });
});

describe("Vault route stage", () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.openVault.mockReset();
  });

  it("shows Opening Vault… on the Welcome stage while loading", async () => {
    mocks.list.mockImplementation(() => new Promise(() => {}));
    renderAt("/vault/notes");

    expect(await screen.findByText(WELCOME_COPY.opening)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("copper-welcome");
    expect(screen.getByRole("main")).toHaveAttribute("data-layout", "status");
  });

  it("returns to Welcome from a failed Vault route", async () => {
    mocks.list.mockResolvedValue([]);
    const { user } = renderAt("/vault/missing");

    expect(
      await screen.findByRole("heading", { name: WELCOME_COPY.couldNotOpen }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("link", { name: WELCOME_COPY.chooseVault }),
    );
    expect(
      await screen.findByRole("heading", { name: WELCOME_COPY.heading }),
    ).toBeInTheDocument();
  });
});
