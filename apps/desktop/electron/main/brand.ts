import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { APP_IDENTITY } from "./identity";
import { isPackagedApp } from "./runtime";

export function brandIconPath(): string {
  if (isPackagedApp()) {
    return path.join(process.resourcesPath, APP_IDENTITY.icon.dockResource);
  }
  return path.join(
    app.getAppPath(),
    APP_IDENTITY.icon.directory,
    APP_IDENTITY.icon.dockSource,
  );
}

export function applyNativeBrand(): void {
  const icon = brandIconPath();
  if (!fs.existsSync(icon) || process.platform !== "darwin") {
    return;
  }
  app.dock?.setIcon(icon);
}
