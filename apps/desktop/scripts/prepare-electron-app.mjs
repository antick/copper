import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_NAME = "Copper";
const APP_BUNDLE = `${APP_NAME}.app`;
const DIST_DIR = path.join(root, ".copper-electron", "dist");
const STAMP_FILE = path.join(root, ".copper-electron", "stamp");
const ICON_ICNS = path.join(root, "resources", "icons", "copper.icns");
const BUNDLE_ICON_NAME = "Copper.icns";
const PREPARATION_VERSION = "v5";
const BUNDLE_METADATA = {
  CFBundleName: APP_NAME,
  CFBundleDisplayName: APP_NAME,
  CFBundleExecutable: APP_NAME,
  CFBundleIconFile: BUNDLE_ICON_NAME,
  CFBundleIdentifier: "app.copper.desktop",
};
const ICU_DAT = "icudtl.dat";
const FRAMEWORK_RESOURCES_SEGMENTS = [
  APP_BUNDLE,
  "Contents",
  "Frameworks",
  "Electron Framework.framework",
  "Resources",
];

function electronPackageDir() {
  return path.dirname(require.resolve("electron/package.json"));
}

function electronVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(electronPackageDir(), "package.json"), "utf8"),
  );
  return String(pkg.version);
}

function fileDigest(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function stampValue() {
  return `${PREPARATION_VERSION}:${electronVersion()}:${fileDigest(ICON_ICNS)}`;
}

export function frameworkResourcesPath(distDir) {
  return path.join(distDir, ...FRAMEWORK_RESOURCES_SEGMENTS);
}

export function copyElectronDist(sourceDist, destDist) {
  fs.mkdirSync(path.dirname(destDist), { recursive: true });
  fs.cpSync(fs.realpathSync(sourceDist), destDist, {
    recursive: true,
    verbatimSymlinks: true,
  });
  const appPath = path.join(destDist, APP_BUNDLE);
  fs.renameSync(path.join(destDist, "Electron.app"), appPath);
  fs.renameSync(
    path.join(appPath, "Contents", "MacOS", "Electron"),
    path.join(appPath, "Contents", "MacOS", APP_NAME),
  );
}

export function assertBrandedElectronBundle(distDir) {
  const resources = frameworkResourcesPath(distDir);
  let stats;
  try {
    stats = fs.lstatSync(resources);
  } catch {
    throw new Error("Missing Electron Framework Resources in branded copy");
  }
  if (!stats.isSymbolicLink()) {
    throw new Error(
      "Electron Framework Resources must be a symlink inside the app bundle",
    );
  }
  const link = fs.readlinkSync(resources);
  if (path.isAbsolute(link) || link.includes("node_modules")) {
    throw new Error(
      `Electron Framework Resources symlink must stay relative inside the app bundle, got ${link}`,
    );
  }
  const icu = path.join(resources, ICU_DAT);
  if (!fs.existsSync(icu)) {
    throw new Error(`Missing ${ICU_DAT} in branded ${APP_BUNDLE}`);
  }
}

export function assertBrandedCopperIcon(distDir, sourceIcon = ICON_ICNS) {
  const bundledIcon = path.join(
    distDir,
    APP_BUNDLE,
    "Contents",
    "Resources",
    BUNDLE_ICON_NAME,
  );
  if (
    !fs.existsSync(bundledIcon) ||
    fileDigest(bundledIcon) !== fileDigest(sourceIcon)
  ) {
    throw new Error(
      "Branded Copper.app must contain the canonical Copper icon",
    );
  }
}

export function assertBrandedCopperIdentity(distDir) {
  const contents = path.join(distDir, APP_BUNDLE, "Contents");
  const result = spawnSync(
    "plutil",
    ["-convert", "json", "-o", "-", path.join(contents, "Info.plist")],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error("Cannot read Copper bundle identity");
  }
  const metadata = JSON.parse(result.stdout);
  for (const [key, value] of Object.entries(BUNDLE_METADATA)) {
    if (metadata[key] !== value) {
      throw new Error(`Copper bundle ${key} must be ${value}`);
    }
  }
  fs.accessSync(path.join(contents, "MacOS", APP_NAME), fs.constants.X_OK);
}

function alreadyPrepared() {
  const appPath = path.join(DIST_DIR, APP_BUNDLE);
  if (!fs.existsSync(appPath) || !fs.existsSync(STAMP_FILE)) {
    return false;
  }
  return fs.readFileSync(STAMP_FILE, "utf8") === stampValue();
}

function replacePlistString(plistPath, key, value) {
  const result = spawnSync(
    "plutil",
    ["-replace", key, "-string", value, plistPath],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`plutil failed to set ${key}`);
  }
}

export function prepareElectronApp() {
  if (process.platform !== "darwin") {
    return undefined;
  }
  if (!fs.existsSync(ICON_ICNS)) {
    throw new Error(`Missing Copper icon at ${ICON_ICNS}`);
  }
  if (alreadyPrepared()) {
    try {
      assertBrandedElectronBundle(DIST_DIR);
      assertBrandedCopperIcon(DIST_DIR);
      assertBrandedCopperIdentity(DIST_DIR);
      return DIST_DIR;
    } catch {
      // Rebuild damaged or stale branding even when the stamp still matches.
    }
  }

  const sourceDist = path.join(electronPackageDir(), "dist");
  fs.rmSync(path.join(root, ".copper-electron"), {
    recursive: true,
    force: true,
  });
  copyElectronDist(sourceDist, DIST_DIR);
  assertBrandedElectronBundle(DIST_DIR);

  const plist = path.join(DIST_DIR, APP_BUNDLE, "Contents", "Info.plist");
  for (const [key, value] of Object.entries(BUNDLE_METADATA)) {
    replacePlistString(plist, key, value);
  }
  fs.copyFileSync(
    ICON_ICNS,
    path.join(DIST_DIR, APP_BUNDLE, "Contents", "Resources", BUNDLE_ICON_NAME),
  );
  assertBrandedCopperIcon(DIST_DIR);
  assertBrandedCopperIdentity(DIST_DIR);
  fs.writeFileSync(STAMP_FILE, stampValue());
  return DIST_DIR;
}

export function brandedElectronExecPath() {
  const dist = prepareElectronApp();
  if (!dist) {
    return undefined;
  }
  const execPath = path.join(dist, APP_BUNDLE, "Contents", "MacOS", APP_NAME);
  if (!fs.existsSync(execPath)) {
    throw new Error(`Branded Electron binary missing at ${execPath}`);
  }
  return execPath;
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const execPath = brandedElectronExecPath();
  if (execPath) {
    process.stdout.write(`${execPath}\n`);
  }
}
