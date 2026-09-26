import path from "node:path";
import { app, ipcMain } from "electron";
import { validateInvocation } from "../../src/lib/copper/command-contract";
import { APP_ID, APP_NAME, USER_DATA_DIR_NAME } from "../native/constants";
import { toCopperError } from "../native/errors";
import { VaultManager } from "../native/vaults";
import { applyNativeBrand, brandIconPath } from "./brand";
import { handleCommand } from "./handlers";
import { installApplicationMenu } from "./menu";
import { assertTrustedSender, openExternalLink } from "./security";
import { appState } from "./state";
import {
  checkForUpdate,
  downloadUpdate,
  installUpdate,
  startUpdateChecks,
} from "./updater";
import { setWatchWindow } from "./watch";
import { createMainWindow } from "./window";

app.setName(APP_NAME);
app.setPath(
  "userData",
  process.env.COPPER_USER_DATA_DIR ??
    path.join(app.getPath("appData"), USER_DATA_DIR_NAME),
);
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
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
        installUpdate();
        return null;
      }
      if (command === "relaunch_app") {
        app.relaunch();
        app.exit(0);
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
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    version: "",
    copyright: APP_NAME,
    iconPath: brandIconPath(),
  });
  installApplicationMenu();
  const window = createMainWindow();
  setWatchWindow(window);
  startUpdateChecks();
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
