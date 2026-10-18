import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_IDENTITIES } from "../electron/app-identity.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_IDENTITY = APP_IDENTITIES.production;
const PREPARATION_VERSION = "v6";
const ICU_DAT = "icudtl.dat";

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

function appBundlePath(distDir, identity) {
  return path.join(distDir, identity.bundleName);
}

function preparationPaths(identity) {
  const directory = path.join(root, identity.preparationDirectory);
  return {
    dist: path.join(directory, "dist"),
    stamp: path.join(directory, "stamp"),
    icon: path.join(root, identity.icon.directory, identity.icon.icnsSource),
  };
}

function bundleMetadata(identity) {
  return {
    CFBundleName: identity.appName,
    CFBundleDisplayName: identity.appName,
    CFBundleExecutable: identity.executableName,
    CFBundleIconFile: identity.icon.icnsBundle,
    CFBundleIdentifier: identity.appId,
  };
}

export function frameworkResourcesPath(
  distDir,
  identity = PRODUCTION_IDENTITY,
) {
  return path.join(
    appBundlePath(distDir, identity),
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Resources",
  );
}

export function copyElectronDist(
  sourceDist,
  destDist,
  identity = PRODUCTION_IDENTITY,
) {
  fs.mkdirSync(path.dirname(destDist), { recursive: true });
  fs.cpSync(fs.realpathSync(sourceDist), destDist, {
    recursive: true,
    verbatimSymlinks: true,
  });
  const appPath = appBundlePath(destDist, identity);
  fs.renameSync(path.join(destDist, "Electron.app"), appPath);
  fs.renameSync(
    path.join(appPath, "Contents", "MacOS", "Electron"),
    path.join(appPath, "Contents", "MacOS", identity.executableName),
  );
}

export function assertBrandedElectronBundle(
  distDir,
  identity = PRODUCTION_IDENTITY,
) {
  const resources = frameworkResourcesPath(distDir, identity);
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
    throw new Error(`Missing ${ICU_DAT} in branded ${identity.bundleName}`);
  }
}

export function assertBrandedCopperIcon(
  distDir,
  sourceIcon,
  identity = PRODUCTION_IDENTITY,
) {
  const paths = preparationPaths(identity);
  const bundledIcon = path.join(
    appBundlePath(distDir, identity),
    "Contents",
    "Resources",
    identity.icon.icnsBundle,
  );
  if (
    !fs.existsSync(bundledIcon) ||
    fileDigest(bundledIcon) !== fileDigest(sourceIcon ?? paths.icon)
  ) {
    throw new Error(
      `Branded ${identity.bundleName} must contain its canonical icon`,
    );
  }
}

export function assertBrandedCopperIdentity(
  distDir,
  identity = PRODUCTION_IDENTITY,
) {
  const contents = path.join(appBundlePath(distDir, identity), "Contents");
  const result = spawnSync(
    "plutil",
    ["-convert", "json", "-o", "-", path.join(contents, "Info.plist")],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Cannot read ${identity.appName} bundle identity`);
  }
  const metadata = JSON.parse(result.stdout);
  for (const [key, value] of Object.entries(bundleMetadata(identity))) {
    if (metadata[key] !== value) {
      throw new Error(`${identity.appName} bundle ${key} must be ${value}`);
    }
  }
  fs.accessSync(
    path.join(contents, "MacOS", identity.executableName),
    fs.constants.X_OK,
  );
}

function stampValue(identity, iconPath) {
  return `${PREPARATION_VERSION}:${electronVersion()}:${JSON.stringify(identity)}:${fileDigest(iconPath)}`;
}

function alreadyPrepared(identity, paths) {
  if (
    !fs.existsSync(appBundlePath(paths.dist, identity)) ||
    !fs.existsSync(paths.stamp)
  ) {
    return false;
  }
  return (
    fs.readFileSync(paths.stamp, "utf8") === stampValue(identity, paths.icon)
  );
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

export function prepareElectronApp(identity = PRODUCTION_IDENTITY) {
  if (process.platform !== "darwin") {
    return undefined;
  }
  const paths = preparationPaths(identity);
  if (!fs.existsSync(paths.icon)) {
    throw new Error(`Missing ${identity.appName} icon at ${paths.icon}`);
  }
  if (alreadyPrepared(identity, paths)) {
    try {
      assertBrandedElectronBundle(paths.dist, identity);
      assertBrandedCopperIcon(paths.dist, undefined, identity);
      assertBrandedCopperIdentity(paths.dist, identity);
      return paths.dist;
    } catch {
      // Rebuild damaged or stale branding even when the stamp still matches.
    }
  }

  const sourceDist = path.join(electronPackageDir(), "dist");
  fs.rmSync(path.join(root, identity.preparationDirectory), {
    recursive: true,
    force: true,
  });
  copyElectronDist(sourceDist, paths.dist, identity);
  assertBrandedElectronBundle(paths.dist, identity);

  const plist = path.join(
    appBundlePath(paths.dist, identity),
    "Contents",
    "Info.plist",
  );
  for (const [key, value] of Object.entries(bundleMetadata(identity))) {
    replacePlistString(plist, key, value);
  }
  fs.copyFileSync(
    paths.icon,
    path.join(
      appBundlePath(paths.dist, identity),
      "Contents",
      "Resources",
      identity.icon.icnsBundle,
    ),
  );
  assertBrandedCopperIcon(paths.dist, undefined, identity);
  assertBrandedCopperIdentity(paths.dist, identity);
  fs.writeFileSync(paths.stamp, stampValue(identity, paths.icon));
  return paths.dist;
}

export function brandedElectronExecPath(identity = PRODUCTION_IDENTITY) {
  const dist = prepareElectronApp(identity);
  if (!dist) {
    return undefined;
  }
  const execPath = path.join(
    dist,
    identity.bundleName,
    "Contents",
    "MacOS",
    identity.executableName,
  );
  if (!fs.existsSync(execPath)) {
    throw new Error(
      `${identity.appName} Electron binary missing at ${execPath}`,
    );
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
