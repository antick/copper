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
  flushOpenDocuments: vi.fn(async () => undefined),
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
    },
  },
}));

vi.mock("@/lib/copper/events", () => ({
  flushOpenDocuments: () => mocks.flushOpenDocuments(),
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
  const { status, checkNow, startUpdate, requestRestart, retryUpdate } =
    useUpdates();
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
      <button type="button" onClick={() => void checkNow()}>
        Check
      </button>
      <button type="button" onClick={() => void startUpdate()}>
        Start
      </button>
      <button type="button" onClick={() => void requestRestart()}>
        Restart
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
    mocks.confirmRestart.mockReturnValue(true);
    mocks.installUpdate.mockReset().mockResolvedValue(undefined);
    mocks.flushOpenDocuments.mockReset().mockResolvedValue(undefined);
    mocks.downloadUpdate.mockReset().mockImplementation(async (onProgress) => {
      onProgress(40, 100);
    });
    mocks.checkForUpdate.mockReset().mockResolvedValue({
      kind: "available",
      version: "0.1.1",
    });
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

  it("downloads to ready, then installs only after explicit restart", async () => {
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByText("ready");
    expect(mocks.installUpdate).not.toHaveBeenCalled();
    expect(mocks.confirmRestart).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Restart" }));
    await waitFor(() => expect(mocks.installUpdate).toHaveBeenCalledOnce());
    expect(mocks.confirmRestart).toHaveBeenCalledOnce();
    expect(mocks.flushOpenDocuments).toHaveBeenCalledOnce();
  });

  it("keeps the staged update ready when restart is deferred", async () => {
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
    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(mocks.installUpdate).not.toHaveBeenCalled();
    expect(mocks.flushOpenDocuments).not.toHaveBeenCalled();
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

  it("retries a failed explicit install without downloading again", async () => {
    mocks.installUpdate.mockRejectedValueOnce(new Error("write denied"));
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByText("ready");
    await user.click(screen.getByRole("button", { name: "Restart" }));
    await screen.findByText("install");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.installUpdate).toHaveBeenCalledTimes(2));
    expect(mocks.downloadUpdate).toHaveBeenCalledOnce();
    expect(mocks.flushOpenDocuments).toHaveBeenCalledTimes(2);
  });

  it("stays in restarting while the native installer is pending, then offers retry on error", async () => {
    let failInstall!: (error: Error) => void;
    mocks.installUpdate.mockImplementationOnce(
      () =>
        new Promise<undefined>((_resolve, reject) => {
          failInstall = reject;
        }),
    );
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByText("ready");
    await user.click(screen.getByRole("button", { name: "Restart" }));
    await screen.findByText("restarting");
    expect(mocks.installUpdate).toHaveBeenCalledOnce();

    failInstall(new Error("ShipIt failed to install the update"));
    await screen.findByText("install");
    expect(
      screen.getByText(/ShipIt failed to install the update/),
    ).toBeInTheDocument();
  });

  it("blocks the restart when an open document cannot be saved", async () => {
    mocks.flushOpenDocuments.mockRejectedValueOnce(new Error("save denied"));
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await screen.findByText("available");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByText("ready");
    await user.click(screen.getByRole("button", { name: "Restart" }));
    await screen.findByText("save");
    expect(screen.getByText(/save denied/)).toBeInTheDocument();
    expect(mocks.installUpdate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.installUpdate).toHaveBeenCalledOnce());
    expect(mocks.flushOpenDocuments).toHaveBeenCalledTimes(2);
  });

  it("shares one check while automatic and manual checks overlap", async () => {
    let completeCheck!: (result: { kind: string; version: string }) => void;
    mocks.checkForUpdate.mockImplementationOnce(
      () => new Promise((resolve) => (completeCheck = resolve)),
    );
    const user = userEvent.setup();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    await waitFor(() => expect(mocks.checkForUpdate).toHaveBeenCalledOnce());
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(mocks.checkForUpdate).toHaveBeenCalledOnce();
    completeCheck({ kind: "available", version: "0.1.1" });
    await screen.findByText("available");
    expect(mocks.checkForUpdate).toHaveBeenCalledOnce();
  });
});
