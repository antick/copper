import { afterEach, expect, it, vi } from "vitest";
import { isPackagedApp } from "./runtime";

const electron = vi.hoisted(() => ({ app: { isPackaged: true } }));
vi.mock("electron", () => electron);
afterEach(() => vi.unstubAllGlobals());

it("keeps renamed development launches out of packaged-only paths", () => {
  vi.stubGlobal("process", { ...process, defaultApp: true });
  expect(isPackagedApp()).toBe(false);
  vi.stubGlobal("process", { ...process, defaultApp: undefined });
  expect(isPackagedApp()).toBe(true);
  electron.app.isPackaged = false;
  expect(isPackagedApp()).toBe(false);
});
