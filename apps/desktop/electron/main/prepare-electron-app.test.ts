import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertBrandedCopperIcon,
  assertBrandedCopperIdentity,
  assertBrandedElectronBundle,
  copyElectronDist,
  frameworkResourcesPath,
} from "../../scripts/prepare-electron-app.mjs";
import { APP_IDENTITIES } from "../app-identity.mjs";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

function writeMiniElectronDist(root: string, bundle = "Electron.app") {
  const executable = path.join(root, bundle, "Contents", "MacOS", "Electron");
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.writeFileSync(executable, "fixture", { mode: 0o755 });
  const framework = path.join(
    root,
    bundle,
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
  );
  const versionResources = path.join(framework, "Versions", "A", "Resources");
  fs.mkdirSync(versionResources, { recursive: true });
  fs.writeFileSync(path.join(versionResources, "icudtl.dat"), "icu-fixture");
  fs.symlinkSync("A", path.join(framework, "Versions", "Current"));
  fs.symlinkSync(
    "Versions/Current/Resources",
    path.join(framework, "Resources"),
  );
}

describe("copyElectronDist", () => {
  it("keeps framework Resources as a relative in-bundle symlink", () => {
    const source = tempDir("copper-electron-src-");
    const dest = path.join(tempDir("copper-electron-dst-"), "dist");
    writeMiniElectronDist(source);
    copyElectronDist(source, dest);

    expect(fs.existsSync(path.join(source, "Electron.app"))).toBe(true);
    expect(fs.existsSync(path.join(dest, "Electron.app"))).toBe(false);
    const binary = "Copper.app/Contents/MacOS/Copper";
    expect(() =>
      fs.accessSync(path.join(dest, binary), fs.constants.X_OK),
    ).not.toThrow();
    const resources = frameworkResourcesPath(dest);
    expect(fs.readlinkSync(resources)).toBe("Versions/Current/Resources");
    expect(
      fs.readlinkSync(path.join(resources, "..", "Versions", "Current")),
    ).toBe("A");
    expect(() => assertBrandedElectronBundle(dest)).not.toThrow();
    expect(fs.readFileSync(path.join(resources, "icudtl.dat"), "utf8")).toBe(
      "icu-fixture",
    );
  });

  it("gives the development bundle a separate name and executable", () => {
    const identity = APP_IDENTITIES.development;
    const source = tempDir("copper-dev-electron-src-");
    const dest = path.join(tempDir("copper-dev-electron-dst-"), "dist");
    writeMiniElectronDist(source);
    copyElectronDist(source, dest, identity);

    const executable = path.join(
      dest,
      identity.bundleName,
      "Contents",
      "MacOS",
      identity.executableName,
    );
    expect(fs.existsSync(path.join(dest, "Electron.app"))).toBe(false);
    expect(fs.existsSync(executable)).toBe(true);
    expect(frameworkResourcesPath(dest, identity)).toBe(
      path.join(
        dest,
        identity.bundleName,
        "Contents",
        "Frameworks",
        "Electron Framework.framework",
        "Resources",
      ),
    );
    expect(() => assertBrandedElectronBundle(dest, identity)).not.toThrow();
  });

  it("rejects a copy whose Resources symlink points outside the bundle", () => {
    const dist = tempDir("copper-electron-abs-");
    writeMiniElectronDist(dist, "Copper.app");
    const resources = frameworkResourcesPath(dist);
    fs.unlinkSync(resources);
    fs.symlinkSync("/tmp/outside-electron-resources", resources);
    expect(() => assertBrandedElectronBundle(dist)).toThrow(/relative/);
  });
});

describe("assertBrandedCopperIcon", () => {
  it("rejects a stale prepared bundle icon", () => {
    const dist = tempDir("copper-electron-icon-");
    const sourceIcon = path.join(tempDir("copper-icon-source-"), "copper.icns");
    const bundledIcon = path.join(
      dist,
      "Copper.app",
      "Contents",
      "Resources",
      "Copper.icns",
    );
    fs.mkdirSync(path.dirname(bundledIcon), { recursive: true });
    fs.writeFileSync(sourceIcon, "canonical-copper-icon");
    fs.writeFileSync(bundledIcon, "stale-icon");

    expect(() => assertBrandedCopperIcon(dist, sourceIcon)).toThrow(
      /canonical icon/,
    );
    fs.copyFileSync(sourceIcon, bundledIcon);
    expect(() => assertBrandedCopperIcon(dist, sourceIcon)).not.toThrow();
  });

  it("checks the development bundle against its separate icon", () => {
    const identity = APP_IDENTITIES.development;
    const dist = tempDir("copper-dev-electron-icon-");
    const sourceIcon = path.join(
      tempDir("copper-dev-icon-source-"),
      "dev.icns",
    );
    const bundledIcon = path.join(
      dist,
      identity.bundleName,
      "Contents",
      "Resources",
      identity.icon.icnsBundle,
    );
    fs.mkdirSync(path.dirname(bundledIcon), { recursive: true });
    fs.writeFileSync(sourceIcon, "canonical-development-icon");
    fs.writeFileSync(bundledIcon, "stale-icon");

    expect(() => assertBrandedCopperIcon(dist, sourceIcon, identity)).toThrow(
      /canonical icon/,
    );
    fs.copyFileSync(sourceIcon, bundledIcon);
    expect(() =>
      assertBrandedCopperIcon(dist, sourceIcon, identity),
    ).not.toThrow();
  });
});

// plutil is a macOS system tool, matching the platform-specific preparation.
describe.skipIf(process.platform !== "darwin")(
  "assertBrandedCopperIdentity",
  () => {
    it("rejects stale names and missing executables for both app identities", () => {
      for (const identity of Object.values(APP_IDENTITIES)) {
        const dist = tempDir("copper-identity-");
        const contents = path.join(dist, identity.bundleName, "Contents");
        const executable = path.join(
          contents,
          "MacOS",
          identity.executableName,
        );
        fs.mkdirSync(path.dirname(executable), { recursive: true });
        fs.writeFileSync(executable, "fixture", { mode: 0o755 });
        const metadata = {
          CFBundleName: identity.appName,
          CFBundleDisplayName: identity.appName,
          CFBundleExecutable: identity.executableName,
          CFBundleIconFile: identity.icon.icnsBundle,
          CFBundleIdentifier: identity.appId,
        };
        const writePlist = (values: typeof metadata) =>
          fs.writeFileSync(
            path.join(contents, "Info.plist"),
            `<plist version="1.0"><dict>${Object.entries(values)
              .map(
                ([key, value]) => `<key>${key}</key><string>${value}</string>`,
              )
              .join("")}</dict></plist>`,
          );
        writePlist(metadata);
        expect(() => assertBrandedCopperIdentity(dist, identity)).not.toThrow();
        for (const key of Object.keys(metadata)) {
          writePlist({ ...metadata, [key]: "Electron" });
          expect(() => assertBrandedCopperIdentity(dist, identity)).toThrow(
            key,
          );
        }
        writePlist(metadata);
        fs.rmSync(executable);
        expect(() => assertBrandedCopperIdentity(dist, identity)).toThrow();
      }
    });
  },
);
