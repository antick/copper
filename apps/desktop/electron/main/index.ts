import { app, BrowserWindow, ipcMain } from "electron";
import { validateInvocation } from "../../src/lib/copper/command-contract";
import { UPDATE_EVENT_CHANNEL } from "../../src/lib/updates/config";
import { toCopperError } from "../native/errors";
import { VaultManager } from "../native/vaults";
import { applyNativeBrand, brandIconPath } from "./brand";
import { handleCommand } from "./handlers";
import { APP_IDENTITY, userDataPath } from "./identity";
import { installApplicationMenu } from "./menu";
import { assertTrustedSender, openExternalLink } from "./security";
import { appState } from "./state";
import {
  checkForUpdate,
  downloadUpdate,
  installUpdate,
  onUpdateEvent,
} from "./updater";
import { setWatchWindow } from "./watch";
import { createMainWindow } from "./window";

app.setName(APP_IDENTITY.appName);
app.setPath(
  "userData",
  userDataPath(app.getPath("appData"), process.env.COPPER_USER_DATA_DIR),
);
if (process.platform === "win32") {
  app.setAppUserModelId(APP_IDENTITY.appId);
}

function readyPaths(): void {
  const userData = app.getPath("userData");
  appState.dataDir = userData;
  appState.configDir = userData;
  appState.vaults = new VaultManager(userData);
}

ipcMain.handle(
  "copper:invoke",
  async (event, command: string, args?: unknown) => {
    try {
      assertTrustedSender(event);
      const payload = validateInvocation(command, args);
      if (command === "check_for_update") {
        return await checkForUpdate();
      }
      if (command === "download_update") {
        await downloadUpdate();
        return null;
      }
      if (command === "install_update") {
        await installUpdate();
        return null;
      }
      return await handleCommand(command, payload);
    } catch (error) {
      const copper = toCopperError(error);
      return { __copperError: copper.toJSON() };
    }
  },
);

ipcMain.handle("copper:open-external", openExternalLink);

app.whenReady().then(() => {
  readyPaths();
  applyNativeBrand();
  app.setAboutPanelOptions({
    applicationName: APP_IDENTITY.appName,
    applicationVersion: app.getVersion(),
    version: "",
    copyright: APP_IDENTITY.appName,
    iconPath: brandIconPath(),
  });
  installApplicationMenu();
  const window = createMainWindow();
  setWatchWindow(window);
  onUpdateEvent((payload) => {
    for (const target of BrowserWindow.getAllWindows()) {
      if (!target.isDestroyed() && !target.webContents.isDestroyed()) {
        target.webContents.send(UPDATE_EVENT_CHANNEL, payload);
      }
    }
  });
  app.on("activate", () => {
    if (window.isDestroyed()) {
      const next = createMainWindow();
      setWatchWindow(next);
    } else {
      window.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
