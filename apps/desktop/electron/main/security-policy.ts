import path from "node:path";
import { pathToFileURL } from "node:url";

export function rendererLocation(
  directory: string,
  developmentUrl?: string,
): string {
  if (developmentUrl) {
    const url = new URL(developmentUrl);
    if (
      url.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      throw new Error(
        "The development renderer must use a loopback HTTP origin",
      );
    }
    return url.href;
  }
  return pathToFileURL(path.join(directory, "../renderer/index.html")).href;
}

export function trustedRendererUrl(value: string, expected: string): boolean {
  try {
    const actual = new URL(value);
    const target = new URL(expected);
    if (target.protocol === "file:") {
      actual.hash = "";
      target.hash = "";
      return actual.href === target.href;
    }
    return (
      actual.origin === target.origin && !actual.username && !actual.password
    );
  } catch {
    return false;
  }
}

export function contentSecurityPolicy(developmentUrl?: string): string {
  const dev = developmentUrl ? new URL(developmentUrl).origin : "";
  const connections = dev ? `${dev} ${dev.replace(/^http:/, "ws:")}` : "'none'";
  return [
    "default-src 'none'",
    `script-src 'self'${dev ? " 'unsafe-inline'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connections}`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
