import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateProvider, useUpdates } from "@/features/updates/update-provider";

const mocks = vi.hoisted(() => ({
  canCheckUpdates: vi.fn(() => true),
  checkForUpdate: vi.fn(),
  downloadUpdate: vi.fn(
    async (_onProgress: (received: number, total: number | null) => void) =>
      undefined,
  ),
  installUpdate: vi.fn(async () => undefined),
  relaunchApp: vi.fn(async () => undefined),
  confirmRestart: vi.fn(() => true),
}));

vi.mock("@/lib/copper", () => ({
  copper: {
    updates: {
      canCheckUpdates: () => mocks.canCheckUpdates(),
      checkForUpdate: () => mocks.checkForUpdate(),
      downloadUpdate: (
        onProgress: (received: number, total: number | null) => void,
      ) => mocks.downloadUpdate(onProgress),
      installUpdate: () => mocks.installUpdate(),
      relaunchApp: () => mocks.relaunchApp(),
    },
  },
}));

vi.mock("@/lib/updates/restart-prompt", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/updates/restart-prompt")
  >("@/lib/updates/restart-prompt");
  return {
    ...actual,
    confirmRestart: () => mocks.confirmRestart(),
  };
});

function Probe() {
  const { status, startUpdate, retryUpdate } = useUpdates();
  return (
    <div>
      <span>{status.kind}</span>
      {"version" in status ? <span>{status.version}</span> : null}
      {status.kind === "error" ? (
        <>
          <span>{status.phase}</span>
          <span>{status.summary}</span>
          <span>{status.detail}</span>
        </>
      ) : null}
      <button type="button" onClick={() => void startUpdate()}>
        Start
      </button>
      <button type="button" onClick={() => void retryUpdate()}>
        Retry
      </button>
    </div>
  );
}

describe("UpdateProvider", () => {
  beforeEach(() => {
    mocks.canCheckUpdates.mockReturnValue(true);
    mocks.confirmRestart.mockReturnValue(true);
    mocks.installUpdate.mockClear();
    mocks.relaunchApp.mockClear();
    mocks.downloadUpdate.mockClear();
    mocks.checkForUpdate.mockClear();
    mocks.checkForUpdate.mockResolvedValue({
      kind: "available",
      version: "0.1.1",
    });
    mocks.downloadUpdate.mockImplementation(
      async (onProgress: (received: number, total: number | null) => void) => {
        onProgress(40, 100);
      },
    );
  });

  it("stays idle in browser preview", async () => {
    mocks.canCheckUpdates.mockReturnValue(false);
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(mocks.checkForUpdate).not.toHaveBeenCalled();
  });

  it("downloads, stages, and relaunches after confirmation", async () => {
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => {
      expect(mocks.installUpdate).toHaveBeenCalledTimes(1);
      expect(mocks.relaunchApp).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the session when restart is deferred", async () => {
    mocks.confirmRestart.mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByText("ready");
    expect(mocks.installUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.relaunchApp).not.toHaveBeenCalled();
  });

  it("retains check details and retries the failed phase", async () => {
    mocks.checkForUpdate.mockRejectedValueOnce(
      new Error("net::ERR_INTERNET_DISCONNECTED"),
    );
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("check");
    expect(
      screen.getByText("The update server could not be reached."),
    ).toBeVisible();
    expect(screen.getByText(/ERR_INTERNET_DISCONNECTED/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("available");
    expect(mocks.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it("distinguishes install failures and retries the update", async () => {
    mocks.confirmRestart.mockReturnValue(false);
    mocks.installUpdate.mockRejectedValueOnce(new Error("write denied"));
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByText("install");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("ready");
    expect(mocks.downloadUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.installUpdate).toHaveBeenCalledTimes(2);
  });
});
