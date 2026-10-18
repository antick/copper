import { Menu, type MenuItemConstructorOptions } from "electron";
import { APP_IDENTITY } from "./identity";

export function applicationMenuTemplate(
  platform = process.platform,
): MenuItemConstructorOptions[] {
  const menus: MenuItemConstructorOptions[] = [
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  if (platform === "darwin") {
    menus.unshift({
      label: APP_IDENTITY.appName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }
  return menus;
}

export function installApplicationMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(applicationMenuTemplate()));
}
