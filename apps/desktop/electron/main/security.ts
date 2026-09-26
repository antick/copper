import { type BrowserWindow, type IpcMainInvokeEvent, shell } from "electron";
import { safeExternalUrl } from "../../src/lib/safe-url";
import { contentSecurityPolicy, trustedRendererUrl } from "./security-policy";

let trustedWindow: BrowserWindow | undefined;
let trustedLocation = "";

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (
    !trustedWindow ||
    trustedWindow.isDestroyed() ||
    event.sender.isDestroyed() ||
    event.sender !== trustedWindow.webContents ||
    !event.senderFrame ||
    event.senderFrame !== event.sender.mainFrame ||
    !trustedRendererUrl(event.senderFrame.url, trustedLocation)
  ) {
    throw new Error("Untrusted Copper command sender");
  }
}

export function secureWindow(
  window: BrowserWindow,
  location: string,
  developmentUrl?: string,
): void {
  trustedWindow = window;
  trustedLocation = location;
  const contents = window.webContents;
  contents.session.setPermissionRequestHandler(
    (sender, permission, callback, details) =>
      callback(
        permission === "clipboard-sanitized-write" &&
          sender === contents &&
          details.isMainFrame &&
          trustedRendererUrl(details.requestingUrl, location),
      ),
  );
  contents.session.setPermissionCheckHandler(
    (sender, permission, _origin, details) =>
      permission === "clipboard-sanitized-write" &&
      sender === contents &&
      details.isMainFrame &&
      trustedRendererUrl(details.requestingUrl ?? "", location),
  );
  contents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [contentSecurityPolicy(developmentUrl)],
      },
    });
  });
  contents.on("will-navigate", (event) => event.preventDefault());
  contents.on("will-frame-navigate", (event) => event.preventDefault());
  contents.on("will-redirect", (event) => event.preventDefault());
  contents.on("will-attach-webview", (event) => event.preventDefault());
  // Prevent child Electron windows. The trusted preload captures real link clicks.
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
}

export async function openExternalLink(
  event: IpcMainInvokeEvent,
  value: unknown,
): Promise<void> {
  assertTrustedSender(event);
  const url = typeof value === "string" ? safeExternalUrl(value) : undefined;
  if (!url) throw new Error("Only HTTP(S) links can be opened");
  await shell.openExternal(url);
}
