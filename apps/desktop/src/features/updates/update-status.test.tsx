import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  UpdateStatusControl,
  updateStatusLabel,
} from "@/features/updates/update-status";

const mocks = vi.hoisted(() => ({
  status: {
    kind: "available" as string,
    version: "0.1.1",
    received: 0,
    total: null as number | null,
    phase: "download",
    summary: "Copper could not download the update.",
    detail: "offline",
  },
  startUpdate: vi.fn(async () => undefined),
  requestRestart: vi.fn(async () => undefined),
  retryUpdate: vi.fn(async () => undefined),
}));

vi.mock("@/features/updates/update-provider", () => ({
  useUpdates: () => ({
    status: mocks.status,
    startUpdate: mocks.startUpdate,
    requestRestart: mocks.requestRestart,
    retryUpdate: mocks.retryUpdate,
  }),
}));

describe("update status bar control", () => {
  it("labels available, progress, ready, and error states", () => {
    expect(updateStatusLabel({ kind: "available", version: "0.1.1" })).toBe(
      "Update 0.1.1 available",
    );
    expect(
      updateStatusLabel({
        kind: "downloading",
        version: "0.1.1",
        received: 50,
        total: 100,
      }),
    ).toBe("Downloading update 50%");
    expect(updateStatusLabel({ kind: "ready", version: "0.1.1" })).toBe(
      "Restart to finish 0.1.1",
    );
    expect(
      updateStatusLabel({
        kind: "error",
        phase: "download",
        summary: "Copper could not download the update.",
        detail: "offline",
        version: "0.1.1",
      }),
    ).toBe("Update 0.1.1 failed");
    expect(updateStatusLabel({ kind: "idle" })).toBeNull();
  });

  it("starts a download from the available notice", async () => {
    mocks.status.kind = "available";
    mocks.status.version = "0.1.1";
    const user = userEvent.setup();
    render(<UpdateStatusControl />);
    await user.click(
      screen.getByRole("button", { name: "Update 0.1.1 available" }),
    );
    expect(mocks.startUpdate).toHaveBeenCalledTimes(1);
  });

  it("reopens the restart prompt when the update is ready", async () => {
    mocks.status.kind = "ready";
    const user = userEvent.setup();
    render(<UpdateStatusControl />);
    await user.click(
      screen.getByRole("button", { name: "Restart to finish 0.1.1" }),
    );
    expect(mocks.requestRestart).toHaveBeenCalledTimes(1);
  });

  it("opens failure details and retries instead of silently restarting", async () => {
    mocks.status.kind = "error";
    const user = userEvent.setup();
    render(<UpdateStatusControl />);
    await user.click(
      screen.getByRole("button", { name: "Update 0.1.1 failed" }),
    );
    expect(screen.getByRole("dialog", { name: "Update failed" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.retryUpdate).toHaveBeenCalledTimes(1);
  });
});
