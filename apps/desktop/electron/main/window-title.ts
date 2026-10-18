import type { BrowserWindow } from "electron";

export function pinWindowTitle(window: BrowserWindow, appName: string): void {
  window.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle(appName);
  });
}
