import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitStatusControl } from "@/features/git/git-status-control";
import type { GitPublishResult, GitStatus } from "@/lib/copper/git";

const mocks = vi.hoisted(() => ({
  status: { kind: "not_git" } as GitStatus,
  enable: vi.fn(async () => false),
  publish: vi.fn(
    async (): Promise<GitPublishResult> => ({
      kind: "pushed",
      changedPaths: ["Daily.md"],
      siblingPaths: [],
    }),
  ),
}));

vi.mock("@/lib/copper", () => ({
  copper: {
    git: {
      status: async () => mocks.status,
      enable: () => mocks.enable(),
      publish: () => mocks.publish(),
      diff: async () => ({ path: "Daily.md", text: "+hi", binary: false }),
    },
    search: {
      indexFile: async () => undefined,
    },
  },
}));

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
}

describe("Git status bar control", () => {
  beforeEach(() => {
    mocks.status = { kind: "not_git" };
    mocks.publish.mockClear();
    mocks.publish.mockResolvedValue({
      kind: "pushed",
      changedPaths: ["Daily.md"],
      siblingPaths: [],
    });
  });

  it("renders nothing without Vault-root Git", async () => {
    wrap(<GitStatusControl vaultId="demo" />);
    await waitFor(() => {
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  it("labels reviewable changes and publishes from the dialog", async () => {
    mocks.status = {
      kind: "git",
      branch: "main",
      host: "github",
      dirtyCount: 3,
      ahead: 0,
      behind: 0,
      noteCount: 3,
      paths: ["a.md", "b.md", "c.md"],
      blockReason: null,
    };
    wrap(<GitStatusControl vaultId="demo" />);
    const button = await screen.findByRole("button", {
      name: "Review 3 Git changes",
    });
    expect(button).toHaveTextContent("3 changes");
    await userEvent.click(button);
    expect(mocks.publish).not.toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole("button", { name: "Push vault to GitHub" }),
    );
    await waitFor(() => {
      expect(mocks.publish).toHaveBeenCalledTimes(1);
    });
  });

  it("shows Update from GitHub when behind", async () => {
    mocks.status = {
      kind: "git",
      branch: "main",
      host: "github",
      dirtyCount: 0,
      ahead: 0,
      behind: 2,
      noteCount: 0,
      paths: [],
      blockReason: null,
    };
    wrap(<GitStatusControl vaultId="demo" />);
    const trigger = await screen.findByRole("button", {
      name: "Review 2 Git changes",
    });
    await userEvent.click(trigger);
    expect(screen.getByText("No local file changes.")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Diff" })).toBeNull();
  });

  it("shows a quiet Up to date control", async () => {
    mocks.status = {
      kind: "git",
      branch: "main",
      host: "github",
      dirtyCount: 0,
      ahead: 0,
      behind: 0,
      noteCount: 0,
      paths: [],
      blockReason: null,
    };
    wrap(<GitStatusControl vaultId="demo" />);
    await waitFor(() => {
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  it("disables the control while publishing", async () => {
    let release!: () => void;
    mocks.status = {
      kind: "git",
      branch: "main",
      host: "github",
      dirtyCount: 1,
      ahead: 0,
      behind: 0,
      noteCount: 1,
      paths: ["Daily.md"],
      blockReason: null,
    };
    mocks.publish.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              kind: "pushed",
              changedPaths: [],
              siblingPaths: [],
            });
        }),
    );
    wrap(<GitStatusControl vaultId="demo" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Review 1 Git change" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Push vault to GitHub" }),
    );
    const action = document.querySelector(".copper-git-publish");
    expect(action).toBeDisabled();
    expect(action).toHaveTextContent("Pushing…");
    release();
  });

  it("announces keep-both success copy", async () => {
    mocks.status = {
      kind: "git",
      branch: "main",
      host: "github",
      dirtyCount: 1,
      ahead: 0,
      behind: 0,
      noteCount: 1,
      paths: ["Daily.md"],
      blockReason: null,
    };
    mocks.publish.mockResolvedValue({
      kind: "kept_both",
      changedPaths: ["Daily.md"],
      siblingPaths: ["Daily (from GitHub).md"],
    });
    wrap(<GitStatusControl vaultId="demo" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Review 1 Git change" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Push vault to GitHub" }),
    );
    await waitFor(() => {
      expect(document.querySelector(".copper-git-publish")).toHaveTextContent(
        "Pushed · Daily (from GitHub).md also on GitHub",
      );
    });
  });
});

it("keeps untrusted Git disabled after canceling its native prompt", async () => {
  mocks.status = { kind: "untrusted" };
  mocks.enable.mockClear();
  mocks.publish.mockClear();
  wrap(<GitStatusControl vaultId="demo" />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Enable Git" }));
  expect(mocks.enable).toHaveBeenCalledOnce();
  expect(mocks.publish).not.toHaveBeenCalled();
  expect(
    await screen.findByRole("button", { name: "Enable Git" }),
  ).toBeEnabled();
});
