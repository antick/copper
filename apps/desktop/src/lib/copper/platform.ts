export function guessPlatform(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  if (/Mac/i.test(navigator.platform) || /Mac/i.test(navigator.userAgent)) {
    return "macos";
  }
  if (/Win/i.test(navigator.platform) || /Windows/i.test(navigator.userAgent)) {
    return "windows";
  }
  if (/Linux/i.test(navigator.userAgent)) return "linux";
  return undefined;
}
