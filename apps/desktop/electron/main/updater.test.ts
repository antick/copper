import { afterEach, beforeEach, expect, it, vi } from "vitest";

const updater = vi.hoisted(() => {
  const handlers = new Map<string, Set<(value: unknown) => void>>();
  return {
    handlers,
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on: vi.fn(),
    removeListener: vi.fn(),
    emit: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  };
});

const electronApp = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    handlers,
    getVersion: () => "0.2.0",
    on: vi.fn(),
    removeListener: vi.fn(),
    emit: vi.fn(),
  };
});

vi.mock("node:module", () => ({
  createRequire: () => () => ({ autoUpdater: updater }),
}));
vi.mock("electron", () => ({ app: electronApp }));
vi.mock("./runtime", () => ({ isPackagedApp: () => true }));
vi.mock("../../src/lib/updates/release-policy", () => ({
  RELEASE_UPDATES: {
    automatic: true,
    url: "https://github.com/antick/copper/releases/latest",
    message: "Manual update",
  },
}));

let updaterFunctions: typeof import("./updater");
let originalPlatform: PropertyDescriptor | undefined;

beforeEach(async () => {
  originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  vi.resetModules();
  vi.clearAllMocks();
  updater.handlers.clear();
  electronApp.handlers.clear();
  updater.on.mockImplementation(
    (event: string, handler: (value: unknown) => void) => {
      const handlers = updater.handlers.get(event) ?? new Set();
      handlers.add(handler);
      updater.handlers.set(event, handlers);
    },
  );
  updater.removeListener.mockImplementation(
    (event: string, handler: (value: unknown) => void) => {
      const handlers = updater.handlers.get(event);
      handlers?.delete(handler);
      if (handlers?.size === 0) updater.handlers.delete(event);
    },
  );
  updater.emit.mockImplementation((event: string, value: unknown) => {
    for (const handler of updater.handlers.get(event) ?? []) {
      handler(value);
    }
  });
  electronApp.on.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = electronApp.handlers.get(event) ?? new Set();
      handlers.add(handler);
      electronApp.handlers.set(event, handlers);
    },
  );
  electronApp.removeListener.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = electronApp.handlers.get(event);
      handlers?.delete(handler);
      if (handlers?.size === 0) electronApp.handlers.delete(event);
    },
  );
  electronApp.emit.mockImplementation((event: string, ...args: unknown[]) => {
    for (const handler of electronApp.handlers.get(event) ?? []) {
      handler(...args);
    }
  });
  updater.checkForUpdates.mockResolvedValue({
    isUpdateAvailable: true,
    updateInfo: { version: "0.2.1", releaseNotes: "Fixes" },
  });
  updater.downloadUpdate.mockResolvedValue(undefined);
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: "darwin",
  });
  updaterFunctions = await import("./updater");
});

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, "platform", originalPlatform);
    originalPlatform = undefined;
  }
});

it("checks only packaged macOS release builds", async () => {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: "linux",
  });
  await expect(updaterFunctions.checkForUpdate()).resolves.toEqual({
    kind: "not-packaged",
  });
  expect(updater.checkForUpdates).not.toHaveBeenCalled();
});

it.each([
  {
    name: "a newer update reported by electron-updater",
    isUpdateAvailable: true,
    version: "0.2.1",
    expectedKind: "available",
  },
  {
    name: "an older feed version",
    isUpdateAvailable: false,
    version: "0.1.0",
    expectedKind: "unavailable",
  },
  {
    name: "a staged result electron-updater marks unavailable",
    isUpdateAvailable: false,
    version: "0.3.0",
    expectedKind: "unavailable",
  },
])(
  "honors electron-updater availability for $name",
  async ({ isUpdateAvailable, version, expectedKind }) => {
    updater.checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable,
      updateInfo: { version },
    });
    const result = await updaterFunctions.checkForUpdate();
    expect(result.kind).toBe(expectedKind);
    if (expectedKind === "available") {
      expect(result).toMatchObject({ kind: "available", version });
    }
  },
);

it("coalesces checks and downloads, reports progress, and installs only on request", async () => {
  const [first, second] = await Promise.all([
    updaterFunctions.checkForUpdate(),
    updaterFunctions.checkForUpdate(),
  ]);
  expect(first).toEqual(second);
  expect(first).toMatchObject({ kind: "available", version: "0.2.1" });
  expect(updater.checkForUpdates).toHaveBeenCalledOnce();
  expect(updater.autoDownload).toBe(false);
  expect(updater.autoInstallOnAppQuit).toBe(false);

  const progress = vi.fn();
  const unsubscribe = updaterFunctions.onUpdateEvent(progress);
  let completeDownload!: () => void;
  updater.downloadUpdate.mockImplementationOnce(
    () => new Promise<void>((resolve) => (completeDownload = resolve)),
  );
  const firstDownload = updaterFunctions.downloadUpdate();
  const secondDownload = updaterFunctions.downloadUpdate();
  expect(updater.downloadUpdate).toHaveBeenCalledOnce();

  updater.emit("download-progress", { transferred: 60, total: 100 });
  expect(progress).toHaveBeenCalledWith({
    kind: "download-progress",
    received: 60,
    total: 100,
  });

  completeDownload();
  await Promise.all([firstDownload, secondDownload]);
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
  const installPromise = updaterFunctions.installUpdate();
  expect(updater.quitAndInstall).toHaveBeenCalledOnce();
  const settled = vi.fn();
  void installPromise.then(settled, settled);
  electronApp.emit("before-quit");
  await Promise.resolve();
  expect(settled).not.toHaveBeenCalled();
  unsubscribe();
});

it("keeps the selected update stable when a check overlaps a download", async () => {
  const available = await updaterFunctions.checkForUpdate();
  let completeCheck!: (result: {
    isUpdateAvailable: boolean;
    updateInfo: { version: string };
  }) => void;
  updater.checkForUpdates.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeCheck = resolve;
      }),
  );
  const pendingCheck = updaterFunctions.checkForUpdate();
  let completeDownload!: () => void;
  updater.downloadUpdate.mockImplementationOnce(
    () => new Promise<void>((resolve) => (completeDownload = resolve)),
  );
  const pendingDownload = updaterFunctions.downloadUpdate();

  await expect(updaterFunctions.checkForUpdate()).resolves.toEqual(available);
  completeCheck({
    isUpdateAvailable: true,
    updateInfo: { version: "0.3.0" },
  });
  await expect(pendingCheck).resolves.toEqual(available);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);

  completeDownload();
  await pendingDownload;
  const installPromise = updaterFunctions.installUpdate();
  expect(updater.quitAndInstall).toHaveBeenCalledOnce();
  electronApp.emit("before-quit");
  const settled = vi.fn();
  void installPromise.then(settled, settled);
  await Promise.resolve();
  expect(settled).not.toHaveBeenCalled();
});

it("coalesces install requests and surfaces asynchronous native errors", async () => {
  await updaterFunctions.checkForUpdate();
  await updaterFunctions.downloadUpdate();

  const installPromise = updaterFunctions.installUpdate();
  expect(updaterFunctions.installUpdate()).toBe(installPromise);
  expect(updater.quitAndInstall).toHaveBeenCalledOnce();
  expect(updater.handlers.get("error")?.size).toBe(2);

  const error = new Error("ShipIt failed to install the update");
  updater.emit("error", error);
  await expect(installPromise).rejects.toBe(error);
  expect(updater.handlers.get("error")?.size).toBe(1);
  expect(electronApp.handlers.has("before-quit")).toBe(false);

  const retryPromise = updaterFunctions.installUpdate();
  expect(updater.quitAndInstall).toHaveBeenCalledTimes(2);
  expect(updater.handlers.get("error")?.size).toBe(2);
  const settled = vi.fn();
  void retryPromise.then(settled, settled);
  electronApp.emit("before-quit");
  await Promise.resolve();
  expect(settled).not.toHaveBeenCalled();
  expect(updater.handlers.get("error")?.size).toBe(1);
  expect(electronApp.handlers.has("before-quit")).toBe(false);
});

it("rejects download and install requests without a staged update", async () => {
  await expect(updaterFunctions.downloadUpdate()).rejects.toThrow(
    "No pending update is available to download.",
  );
  await expect(updaterFunctions.installUpdate()).rejects.toThrow(
    "No update has finished downloading.",
  );
});

it("allows a failed download to be retried", async () => {
  await updaterFunctions.checkForUpdate();
  updater.downloadUpdate
    .mockRejectedValueOnce(new Error("network unavailable"))
    .mockResolvedValueOnce(undefined);
  await expect(updaterFunctions.downloadUpdate()).rejects.toThrow(
    "network unavailable",
  );
  await expect(updaterFunctions.downloadUpdate()).resolves.toBeUndefined();
  expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
});
