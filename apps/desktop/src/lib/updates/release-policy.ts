declare const __COPPER_UPDATES_ENABLED__: boolean | undefined;

export const RELEASE_UPDATES = {
  // The build enables this only for verified signed macOS public releases.
  automatic:
    typeof __COPPER_UPDATES_ENABLED__ !== "undefined" &&
    __COPPER_UPDATES_ENABLED__,
  url: "https://github.com/antick/copper/releases/latest",
  message:
    "Download new versions from Copper releases and install them manually.",
};
