import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canCheckUpdates,
  checkForUpdate,
  downloadUpdate,
  installUpdate,
} from "@/lib/copper/updates";

function setDesktop(packaged: boolean, preview = false) {
  window.copperDesktop = {
    packaged,
    invoke: vi.fn(),
    on: () => () => undefined,
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
      return null;
    });

    await expect(checkForUpdate()).resolves.toEqual({
      kind: "available",
      version: "0.2.1",
      currentVersion: "0.2.0",
      notes: "Fixes",
    });
    await downloadUpdate(() => undefined);
    await installUpdate();
    expect(invoke).toHaveBeenCalledWith("check_for_update");
    expect(invoke).toHaveBeenCalledWith("download_update");
    expect(invoke).toHaveBeenCalledWith("install_update");
  });
});
