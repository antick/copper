import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import electron from "electron";
import {
  cleanupReleaseSigning,
  normalizeMacUpdateMetadata,
  prepareReleaseSigning,
  requireReleaseCredentials,
  validateUpdateMetadata,
  verifySignedApp,
  verifySigningIdentity,
} from "./release-policy.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopDirectory = path.resolve(scriptDirectory, "..");
const releaseDirectory = path.join(desktopDirectory, "release-verified");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(desktopDirectory, "package.json"), "utf8"),
);

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: desktopDirectory,
    stdio: "inherit",
    ...options,
  });
}

function capture(command, args) {
  return execFileSync(command, args, {
    cwd: desktopDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function assertReleaseTag(env) {
  if (env.GITHUB_REF_NAME && env.GITHUB_REF_NAME !== `v${packageJson.version}`)
    throw new Error("Release tag must match the desktop package version");
}

function findBundle(directory, name) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(directory, entry.name);
    if (entry.name === name) return candidate;
    const nested = findBundle(candidate, name);
    if (nested) return nested;
  }
  return undefined;
}

function verifyAppVersion(appPath) {
  const actual = capture("plutil", [
    "-extract",
    "CFBundleShortVersionString",
    "raw",
    "-o",
    "-",
    path.join(appPath, "Contents/Info.plist"),
  ]);
  if (actual !== packageJson.version)
    throw new Error(
      `Packaged version ${actual} does not match the release version`,
    );
}

function verifyPackagedSqlite(appPath) {
  const archive = path.join(appPath, "Contents/Resources/app.asar");
  const source = `
    const assert = require('node:assert/strict');
    const root = ${JSON.stringify(archive)};
    assert.equal(require(root + '/package.json').version, ${JSON.stringify(packageJson.version)});
    const Database = require(root + '/node_modules/better-sqlite3');
    const database = new Database(':memory:');
    assert.equal(database.prepare('SELECT 42 AS answer').get().answer, 42);
    database.close();
    console.log('Packaged version and native SQLite verified');
  `;
  execFileSync(electron, ["-e", source], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "inherit",
  });
}

function verifyZip(zipPath, temporaryDirectory) {
  const extractDirectory = fs.mkdtempSync(
    path.join(temporaryDirectory, "zip-extract-"),
  );
  try {
    run("ditto", ["-x", "-k", zipPath, extractDirectory]);
    const app = path.join(extractDirectory, `${packageJson.productName}.app`);
    verifyAppVersion(app);
    verifySignedApp(app, packageJson.build.appId, process.env.APPLE_TEAM_ID);
  } finally {
    fs.rmSync(extractDirectory, { recursive: true, force: true });
  }
}

function verifyDmg(dmgPath, temporaryDirectory) {
  run("hdiutil", ["verify", dmgPath]);
  run("xcrun", ["stapler", "validate", dmgPath]);
  run("spctl", [
    "--assess",
    "--type",
    "open",
    "--context",
    "context:primary-signature",
    dmgPath,
  ]);
  const mountDirectory = fs.mkdtempSync(
    path.join(temporaryDirectory, "dmg-mount-"),
  );
  let mounted = false;
  try {
    run("hdiutil", [
      "attach",
      "-nobrowse",
      "-readonly",
      "-mountpoint",
      mountDirectory,
      dmgPath,
    ]);
    mounted = true;
    const app = path.join(mountDirectory, `${packageJson.productName}.app`);
    verifyAppVersion(app);
    verifySignedApp(app, packageJson.build.appId, process.env.APPLE_TEAM_ID);
  } finally {
    if (mounted) run("hdiutil", ["detach", mountDirectory]);
    fs.rmSync(mountDirectory, { recursive: true, force: true });
  }
}

function notarizeDmg(dmgPath, env) {
  const args = ["notarytool", "submit", dmgPath];
  if (env.APPLE_API_KEY?.trim()) {
    args.push(
      "--key",
      env.APPLE_API_KEY,
      "--key-id",
      env.APPLE_API_KEY_ID,
      "--issuer",
      env.APPLE_API_ISSUER,
    );
  } else {
    args.push("--keychain-profile", env.APPLE_KEYCHAIN_PROFILE);
  }
  const result = JSON.parse(
    capture("xcrun", [
      ...args,
      "--wait",
      "--timeout",
      "30m",
      "--output-format",
      "json",
    ]),
  );
  if (result.status !== "Accepted")
    throw new Error(`DMG notarization failed: ${result.status}`);
  run("xcrun", ["stapler", "staple", dmgPath]);
}

function removeBuilderDiagnostics(output) {
  for (const name of [
    "builder-debug.yml",
    "builder-effective-config.yaml",
    "builder-effective-config.yml",
  ])
    fs.rmSync(path.join(output, name), { force: true });
}

function verifyMacBuild(output, arch, temporaryDirectory) {
  const app = findBundle(output, `${packageJson.productName}.app`);
  if (!app) throw new Error("Release app bundle is missing");
  verifyAppVersion(app);
  verifyPackagedSqlite(app);
  verifySignedApp(app, packageJson.build.appId, process.env.APPLE_TEAM_ID);

  const metadataFiles = validateUpdateMetadata(
    output,
    packageJson.version,
    arch,
  );
  const dmg = path.join(
    output,
    `Copper-${packageJson.version}-mac-${arch}.dmg`,
  );
  const zip = path.join(
    output,
    `Copper-${packageJson.version}-mac-${arch}.zip`,
  );
  for (const artifact of [dmg, zip])
    if (!fs.existsSync(artifact))
      throw new Error(
        `Missing signed macOS installer: ${path.basename(artifact)}`,
      );
  verifyZip(zip, temporaryDirectory);
  verifyDmg(dmg, temporaryDirectory);

  const artifactNames = new Set([
    ...metadataFiles,
    path.basename(dmg),
    path.basename(zip),
  ]);
  const actualFiles = fs
    .readdirSync(output)
    .filter((name) => fs.statSync(path.join(output, name)).isFile());
  const unexpected = actualFiles.filter((name) => !artifactNames.has(name));
  if (unexpected.length)
    throw new Error(
      `Unexpected macOS release artifacts: ${unexpected.join(", ")}`,
    );
  return [...artifactNames].sort();
}

function copyVerifiedArtifacts(output, names) {
  fs.rmSync(releaseDirectory, { recursive: true, force: true });
  fs.mkdirSync(releaseDirectory, { recursive: true });
  for (const name of names)
    fs.copyFileSync(path.join(output, name), path.join(releaseDirectory, name));
}

function buildRelease(arch, env) {
  if (process.platform !== "darwin")
    throw new Error("macOS releases must be built on macOS");
  if (!new Set(["arm64", "x64"]).has(arch))
    throw new Error("macOS release architecture must be arm64 or x64");
  assertReleaseTag(env);
  requireReleaseCredentials(env);
  if (!env.CSC_NAME?.trim() && !env.CSC_LINK?.trim())
    throw new Error("Release build needs CSC_NAME from the signing setup");
  verifySigningIdentity(env);

  const buildEnvironment = {
    ...env,
    COPPER_RELEASE_UPDATES: "1",
  };
  run("pnpm", ["exec", "electron-vite", "build"], { env: buildEnvironment });
  const output = fs.mkdtempSync(
    path.join(desktopDirectory, `.release-production-${arch}-`),
  );
  try {
    run(
      "pnpm",
      [
        "exec",
        "electron-builder",
        "--mac",
        `--${arch}`,
        "--publish",
        "never",
        "-c.forceCodeSigning=true",
        "-c.mac.notarize=true",
        "-c.mac.hardenedRuntime=true",
        "-c.dmg.sign=true",
        `-c.directories.output=${output}`,
      ],
      { env: buildEnvironment },
    );
    removeBuilderDiagnostics(output);
    notarizeDmg(
      path.join(output, `Copper-${packageJson.version}-mac-${arch}.dmg`),
      env,
    );
    normalizeMacUpdateMetadata(output, packageJson.version, arch);
    const names = verifyMacBuild(output, arch, os.tmpdir());
    copyVerifiedArtifacts(output, names);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
}

function main(args, env = process.env) {
  const command = args[0]?.startsWith("--") ? "build" : args[0] || "build";
  const optionArgs =
    command === "build" && args[0]?.startsWith("--") ? args : args.slice(1);
  if (command === "prepare") return prepareReleaseSigning(env);
  if (command === "cleanup") return cleanupReleaseSigning(env);
  if (command !== "build")
    throw new Error(
      "Usage: build-release.mjs prepare|build [--arch arm64|x64]|cleanup",
    );
  const archIndex = optionArgs.indexOf("--arch");
  const arch = archIndex >= 0 ? optionArgs[archIndex + 1] : process.arch;
  return buildRelease(arch, env);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
