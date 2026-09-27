import { afterEach, expect, it, vi } from "vitest";
import { RELEASE_UPDATES } from "../../src/lib/updates/release-policy";

const updater = vi.hoisted(() => ({ checkForUpdates: vi.fn() }));
vi.mock("node:module", () => ({
  createRequire: () => () => ({ autoUpdater: updater }),
}));
vi.mock("electron", () => ({ app: { getVersion: () => "0.2.0" } }));
vi.mock("./runtime", () => ({ isPackagedApp: () => true }));

import { checkForUpdate, startUpdateChecks } from "./updater";

afterEach(() => {
  vi.useRealTimers();
});

it("handles background update failures while exposing manual-check errors", async () => {
  vi.useFakeTimers();
  updater.checkForUpdates.mockRejectedValue(new Error("Update unavailable"));
  startUpdateChecks();
  await vi.advanceTimersToNextTimerAsync();
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
  await expect(checkForUpdate()).rejects.toThrow("Update unavailable");
});

vi.mock("../../src/lib/updates/release-policy", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../src/lib/updates/release-policy")
    >();
  return { RELEASE_UPDATES: { ...actual.RELEASE_UPDATES, automatic: true } };
});

it("does not check the automatic feed in manual release mode", async () => {
  RELEASE_UPDATES.automatic = false;
  updater.checkForUpdates.mockClear();
  try {
    startUpdateChecks();
    await expect(checkForUpdate()).resolves.toEqual({ kind: "not-packaged" });
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  } finally {
    RELEASE_UPDATES.automatic = true;
  }
});
