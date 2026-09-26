/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url":"file:///Applications/Copper.app/Contents/Resources/app.asar/out/renderer/index.html"}
 */
import { describe, expect, it } from "vitest";
import { router } from "./router";

describe("packaged router", () => {
  it("starts the local file renderer at the app root", () => {
    expect(window.location.protocol).toBe("file:");
    expect(router.history.location.pathname).toBe("/");
  });
});
