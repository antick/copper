import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { expect, it, vi } from "vitest";

vi.mock("electron", () => ({ shell: { openExternal: vi.fn() } }));

import {
  assertTrustedSender,
  openExternalLink,
  secureWindow,
} from "./security";

it("rejects different windows, subframes, navigation, and unknown permissions", async () => {
  const mainFrame = { url: "file:///app/index.html" };
  const handlers = new Map<
    string,
    (event: { preventDefault: () => void }) => void
  >();
  const request = vi.fn();
  const check = vi.fn();
  const popup = vi.fn();
  const contents = {
    mainFrame,
    isDestroyed: () => false,
    on: (
      name: string,
      callback: (event: { preventDefault: () => void }) => void,
    ) => handlers.set(name, callback),
    setWindowOpenHandler: popup,
    session: {
      setPermissionRequestHandler: request,
      setPermissionCheckHandler: check,
      webRequest: { onHeadersReceived: vi.fn() },
    },
  };
  secureWindow(
    {
      isDestroyed: () => false,
      webContents: contents,
    } as unknown as BrowserWindow,
    mainFrame.url,
  );
  const event = {
    sender: contents,
    senderFrame: mainFrame,
  } as unknown as IpcMainInvokeEvent;
  expect(() => assertTrustedSender(event)).not.toThrow();
  expect(() =>
    assertTrustedSender({
      ...event,
      senderFrame: { url: mainFrame.url },
    } as IpcMainInvokeEvent),
  ).toThrow();
  expect(() =>
    assertTrustedSender({
      ...event,
      sender: { ...contents },
    } as unknown as IpcMainInvokeEvent),
  ).toThrow();
  mainFrame.url = "https://evil.test";
  expect(() => assertTrustedSender(event)).toThrow();
  mainFrame.url = "file:///app/index.html";
  for (const name of [
    "will-navigate",
    "will-frame-navigate",
    "will-redirect",
    "will-attach-webview",
  ]) {
    const preventDefault = vi.fn();
    handlers.get(name)?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
  }
  expect(popup.mock.calls[0][0]()).toEqual({ action: "deny" });
  const permission = check.mock.calls[0][0];
  expect(
    permission(contents, "media", "", {
      isMainFrame: true,
      requestingUrl: mainFrame.url,
    }),
  ).toBe(false);
  expect(
    permission(contents, "clipboard-read", "", {
      isMainFrame: true,
      requestingUrl: mainFrame.url,
    }),
  ).toBe(false);
  expect(
    permission(contents, "clipboard-sanitized-write", "", {
      isMainFrame: true,
      requestingUrl: mainFrame.url,
    }),
  ).toBe(true);
  expect(
    permission(contents, "clipboard-sanitized-write", "", {
      isMainFrame: false,
      requestingUrl: mainFrame.url,
    }),
  ).toBe(false);
  await expect(
    openExternalLink(event, "file:///private/test"),
  ).rejects.toThrow();
});
