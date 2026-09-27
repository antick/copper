// v0.1.0 ships without publisher certificates. Use manual downloads until a
// signed update flow has been verified; do not advertise an untested updater.
export const RELEASE_UPDATES = {
  automatic: false,
  url: "https://github.com/antick/copper/releases/latest",
  message:
    "Download new versions from Copper releases and install them manually.",
};
