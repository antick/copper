import { describe, expect, it, vi } from "vitest";
import { APP_IDENTITIES } from "../app-identity.mjs";
import { applicationMenuTemplate } from "./menu";

vi.mock("electron", () => ({
  app: { isPackaged: false },
  Menu: { setApplicationMenu() {}, buildFromTemplate: () => ({}) },
}));

describe("application menu", () => {
  it("uses the active app identity as the macOS application menu title", () => {
    const [appMenu] = applicationMenuTemplate("darwin");
    expect(appMenu?.label).toBe(APP_IDENTITIES.development.appName);
    expect(appMenu?.label).not.toBe("Electron");
  });
});
