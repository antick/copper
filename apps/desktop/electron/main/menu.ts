import { Menu, type MenuItemConstructorOptions } from "electron";
import { APP_NAME } from "../native/constants";

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
      label: APP_NAME,
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
