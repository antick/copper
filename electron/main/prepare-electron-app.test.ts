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
      /canonical Copper icon/,
    );
    fs.copyFileSync(sourceIcon, bundledIcon);
    expect(() => assertBrandedCopperIcon(dist, sourceIcon)).not.toThrow();
  });
});

// plutil is a macOS system tool, matching the platform-specific preparation.
describe.skipIf(process.platform !== "darwin")(
  "assertBrandedCopperIdentity",
  () => {
    it("rejects stale names and missing executables in an otherwise valid cache", () => {
      const dist = tempDir("copper-identity-");
      const contents = path.join(dist, "Copper.app", "Contents");
      const executable = path.join(contents, "MacOS", "Copper");
      fs.mkdirSync(path.dirname(executable), { recursive: true });
      fs.writeFileSync(executable, "fixture", { mode: 0o755 });
      const metadata = {
        CFBundleName: "Copper",
        CFBundleDisplayName: "Copper",
        CFBundleExecutable: "Copper",
        CFBundleIconFile: "Copper.icns",
        CFBundleIdentifier: "app.copper.desktop",
      };
      const writePlist = (values: typeof metadata) =>
        fs.writeFileSync(
          path.join(contents, "Info.plist"),
          `<plist version="1.0"><dict>${Object.entries(values)
            .map(([key, value]) => `<key>${key}</key><string>${value}</string>`)
            .join("")}</dict></plist>`,
        );
      writePlist(metadata);
      expect(() => assertBrandedCopperIdentity(dist)).not.toThrow();
      for (const key of Object.keys(metadata)) {
        writePlist({ ...metadata, [key]: "Electron" });
        expect(() => assertBrandedCopperIdentity(dist)).toThrow(key);
      }
      writePlist(metadata);
      fs.rmSync(executable);
      expect(() => assertBrandedCopperIdentity(dist)).toThrow();
    });
  },
);
