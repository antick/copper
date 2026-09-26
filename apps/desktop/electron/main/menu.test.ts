import { describe, expect, it } from "vitest";
import { APP_NAME } from "../native/constants";
import { applicationMenuTemplate } from "./menu";

describe("application menu", () => {
  it("uses Copper as the macOS application menu title", () => {
    const [appMenu] = applicationMenuTemplate("darwin");
    expect(appMenu?.label).toBe(APP_NAME);
    expect(appMenu?.label).not.toBe("Electron");
  });
});
