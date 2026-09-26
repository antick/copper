import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { isPackagedApp } from "./runtime";

const PACKAGED_BRAND_ICON = "Copper.png";

export function brandIconPath(): string {
  if (isPackagedApp()) {
    return path.join(process.resourcesPath, PACKAGED_BRAND_ICON);
  }
  return path.join(app.getAppPath(), "resources", "icons", "icon.png");
}

export function applyNativeBrand(): void {
  const icon = brandIconPath();
  if (!fs.existsSync(icon) || process.platform !== "darwin") {
    return;
  }
  app.dock?.setIcon(icon);
}
