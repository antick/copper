import { afterEach, expect, it, vi } from "vitest";

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
