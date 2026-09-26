import { BrowserWindow } from "electron";
import {
  TRAFFIC_LIGHT_X,
  TRAFFIC_LIGHT_Y,
  WINDOW_HEIGHT,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_WIDTH,
} from "../native/constants";
import { brandIconPath } from "./brand";
import { resolvePreloadScript } from "./preload-path";
import { isPackagedApp } from "./runtime";
import { secureWindow } from "./security";
import { rendererLocation } from "./security-policy";

export function createMainWindow(): BrowserWindow {
  const isMac = process.platform === "darwin";
  const preload = resolvePreloadScript(__dirname);
  const window = new BrowserWindow({
    title: "Copper",
    icon: brandIconPath(),
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: TRAFFIC_LIGHT_X, y: TRAFFIC_LIGHT_Y },
    backgroundColor: "#f7f4ef",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !isPackagedApp(),
    },
  });
  const developmentUrl = !isPackagedApp()
    ? process.env.ELECTRON_RENDERER_URL
    : undefined;
  const location = rendererLocation(__dirname, developmentUrl);
  secureWindow(window, location, developmentUrl);
  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`Copper preload failed (${preloadPath}):`, error);
  });
  if (isMac) {
    window.on("resized", () => window.webContents.invalidate());
  }
  window.webContents.on("did-finish-load", () => {
    void window.webContents
      .executeJavaScript("Boolean(window.copperDesktop)")
      .then((attached) => {
        if (!attached) {
          console.error("Copper desktop bridge is missing after load");
        }
      })
      .catch((error) => {
        console.error("Copper desktop bridge check failed:", error);
      });
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  void window.loadURL(location);

  return window;
}
