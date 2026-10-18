export const APP_IDENTITIES = {
  production: {
    appName: "Copper",
    appId: "app.copper.desktop",
    userDataDirName: "app.copper.desktop",
    bundleName: "Copper.app",
    executableName: "Copper",
    preparationDirectory: ".copper-electron",
    icon: {
      directory: "resources/icons",
      icnsSource: "copper.icns",
      icnsBundle: "Copper.icns",
      dockSource: "icon.png",
      dockResource: "Copper.png",
    },
  },
  development: {
    appName: "Copper Dev",
    appId: "app.copper.desktop.dev",
    userDataDirName: "app.copper.desktop.dev",
    bundleName: "Copper Dev.app",
    executableName: "Copper Dev",
    preparationDirectory: ".copper-electron-dev",
    icon: {
      directory: "dev-resources/icons",
      source: "resources/icons/icon.png",
      icnsSource: "copper-dev.icns",
      icnsBundle: "Copper Dev.icns",
      dockSource: "copper-dev.png",
      dockResource: "Copper Dev.png",
    },
  },
};
