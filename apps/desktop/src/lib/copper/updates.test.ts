import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canCheckUpdates,
  checkForUpdate,
  downloadUpdate,
  installUpdate,
} from "@/lib/copper/updates";
import { UPDATE_EVENT_CHANNEL } from "@/lib/updates/config";
import { RELEASE_UPDATES } from "@/lib/updates/release-policy";

const listeners = new Map<string, (payload: unknown) => void>();

function setDesktop(
  packaged: boolean,
  preview = false,
  updatesSupported = packaged,
) {
  window.copperDesktop = {
    packaged,
    updatesSupported,
    invoke: vi.fn(),
    on: (channel, handler) => {
      listeners.set(channel, handler);
      return () => listeners.delete(channel);
    },
  };
  window.history.replaceState(
    {},
    "",
    preview ? "/?preview=1" : "/settings/advanced",
  );
}

describe("copper.updates", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    delete window.copperDesktop;
    listeners.clear();
  });

  afterEach(() => {
    delete window.copperDesktop;
  });

  it("does not treat browser preview as a packaged updater", () => {
    setDesktop(true, true);
    expect(canCheckUpdates()).toBe(false);
  });

  it("checks the public feed without a user token", async () => {
    setDesktop(true);
    const invoke = window.copperDesktop?.invoke as ReturnType<typeof vi.fn>;
    invoke.mockImplementation(async (command: string) => {
      if (command === "check_for_update") {
        return {
          kind: "available",
          version: "0.2.1",
          currentVersion: "0.2.0",
          notes: "Fixes",
        };
      }
      if (command === "download_update") {
        listeners.get(UPDATE_EVENT_CHANNEL)?.({
          kind: "download-progress",
          received: 60,
          total: 100,
        });
      }
      return null;
    });

    await expect(checkForUpdate()).resolves.toEqual({
      kind: "available",
      version: "0.2.1",
      currentVersion: "0.2.0",
      notes: "Fixes",
    });
    const progress = vi.fn();
    await downloadUpdate(progress);
    await installUpdate();
    expect(progress).toHaveBeenCalledWith(60, 100);
    expect(listeners.has(UPDATE_EVENT_CHANNEL)).toBe(false);
    expect(invoke).toHaveBeenCalledWith("check_for_update");
    expect(invoke).toHaveBeenCalledWith("download_update");
    expect(invoke).toHaveBeenCalledWith("install_update");
  });

  it("does not call the bridge from an unpackaged runtime", async () => {
    setDesktop(false);
    const invoke = window.copperDesktop?.invoke as ReturnType<typeof vi.fn>;
    await expect(checkForUpdate()).resolves.toEqual({ kind: "not-packaged" });
    expect(canCheckUpdates()).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not expose updates on packaged platforms without signed update support", () => {
    setDesktop(true, false, false);
    expect(canCheckUpdates()).toBe(false);
  });
});

vi.mock("@/lib/updates/release-policy", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/updates/release-policy")>();
  return { RELEASE_UPDATES: { ...actual.RELEASE_UPDATES, automatic: true } };
});

it("does not offer automatic checks for the manual release", () => {
  RELEASE_UPDATES.automatic = false;
  try {
    setDesktop(true);
    expect(canCheckUpdates()).toBe(false);
  } finally {
    RELEASE_UPDATES.automatic = true;
  }
});
