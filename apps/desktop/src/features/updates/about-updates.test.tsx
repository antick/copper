import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AboutUpdates } from "@/features/updates/about-updates";

const mocks = vi.hoisted(() => ({
  status: {
    kind: "available" as string,
    version: "0.1.1",
    phase: "download",
    summary: "Download failed",
    detail: "offline",
  },
  checkNow: vi.fn(async () => undefined),
  startUpdate: vi.fn(async () => undefined),
  requestRestart: vi.fn(async () => undefined),
  retryUpdate: vi.fn(async () => undefined),
}));

vi.mock("@/features/updates/update-provider", () => ({
  useUpdates: () => mocks,
}));

describe("About updates", () => {
  beforeEach(() => {
    mocks.status.kind = "available";
    mocks.status.version = "0.1.1";
  });

  it("checks now and starts an available update without a token field", async () => {
    const user = userEvent.setup();
    render(<AboutUpdates />);
    expect(screen.getByText("Version 0.1.1 is available.")).toBeInTheDocument();
    expect(screen.queryByLabelText("GitHub token")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Waiting for a GitHub token/i),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(mocks.checkNow).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole("button", { name: "Download and install" }),
    );
    expect(mocks.startUpdate).toHaveBeenCalledTimes(1);
  });

  it("contains technical failures and exposes retry", async () => {
    mocks.status.kind = "error";
    const user = userEvent.setup();
    render(<AboutUpdates />);
    expect(screen.getAllByText("Download failed")).toHaveLength(2);
    expect(screen.queryByText("offline")).not.toBeVisible();
    await user.click(screen.getByText("Technical details"));
    expect(screen.getByText("offline")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.retryUpdate).toHaveBeenCalledTimes(1);
  });
});
