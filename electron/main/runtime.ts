import { app } from "electron";

export function isPackagedApp(): boolean {
  // Electron treats a renamed binary as packaged, even when launched with `.`.
  return app.isPackaged && !process.defaultApp;
}
