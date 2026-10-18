import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeUpdateMetadata,
  validateUpdateMetadata,
} from "../apps/desktop/scripts/release-metadata.mjs";

const releaseDirectories = [
  "installers-mac-arm64",
  "installers-mac-x64",
  "installers-win-x64",
  "installers-linux-arm64",
  "installers-linux-x64",
];

export function expectedInstallers(version) {
  return [
    ...["arm64", "x64"].flatMap((arch) =>
      ["dmg", "zip"].map(
        (extension) => `Copper-${version}-mac-${arch}.${extension}`,
      ),
    ),
    `Copper-Setup-${version}-x64.exe`,
    ...["x86_64", "arm64"].map((arch) => `Copper-${version}-${arch}.AppImage`),
    ...["amd64", "arm64"].map((arch) => `copper_${version}_${arch}.deb`),
  ].sort();
}

function checksumLines(directory, filenames) {
  return `${[...filenames]
    .sort()
    .map((name) => {
      const bytes = readFileSync(path.join(directory, name));
      assert.ok(bytes.length > 0, `Empty release artifact: ${name}`);
      return `${createHash("sha256").update(bytes).digest("hex")}  ${name}`;
    })
    .join("\n")}\n`;
}

export function verifyInstallers(directory, version) {
  const expected = expectedInstallers(version);
  const actual = readdirSync(directory)
    .filter((name) => name !== "SHA256SUMS")
    .sort();
  assert.deepEqual(
    actual,
    expected,
    "Release must contain all nine installers, with no unexpected files",
  );
  return checksumLines(directory, expected);
}

function readArtifactDirectory(directory, expectedNames, label) {
  assert.ok(existsSync(directory), `Missing ${label} artifact directory`);
  const actual = readdirSync(directory);
  const unexpected = actual.filter((name) => !expectedNames.includes(name));
  assert.deepEqual(unexpected, [], `Unexpected files in ${label} artifact`);
  const missing = expectedNames.filter((name) => !actual.includes(name));
  assert.deepEqual(missing, [], `Incomplete ${label} artifact`);
  assert.ok(
    actual.every((name) => lstatSync(path.join(directory, name)).isFile()),
    `Nested directories are not release files (${label})`,
  );
  return actual;
}

function assertMacArtifact(directory, version, arch) {
  const archive = `Copper-${version}-mac-${arch}.zip`;
  const image = `Copper-${version}-mac-${arch}.dmg`;
  const required = [archive, `${archive}.blockmap`, image, "latest-mac.yml"];
  readArtifactDirectory(directory, required, `macOS ${arch}`);
  validateUpdateMetadata(directory, version, arch);
  return required.filter((name) => name !== "latest-mac.yml");
}

function copyUnique(sourceDirectory, filenames, outputDirectory) {
  for (const name of filenames) {
    const source = path.join(sourceDirectory, name);
    const output = path.join(outputDirectory, name);
    assert.ok(!existsSync(output), `Duplicate release asset: ${name}`);
    copyFileSync(source, output);
  }
}

export function verifyReleaseArtifacts(directory, version) {
  const required = [
    ...expectedInstallers(version),
    "latest-mac.yml",
    ...["arm64", "x64"].map(
      (arch) => `Copper-${version}-mac-${arch}.zip.blockmap`,
    ),
  ];
  const actual = readdirSync(directory)
    .filter((name) => name !== "SHA256SUMS")
    .sort();
  assert.deepEqual(
    actual,
    required.sort(),
    "Release must contain all installers, macOS update files, and no unexpected files",
  );
  validateUpdateMetadata(directory, version);
  const sums = checksumLines(directory, actual);
  assert.equal(
    readFileSync(path.join(directory, "SHA256SUMS"), "utf8"),
    sums,
    "SHA256SUMS must cover every release asset exactly",
  );
  return sums;
}

export function mergeReleaseArtifacts(
  inputDirectory,
  outputDirectory,
  version,
) {
  const actualDirectories = readdirSync(inputDirectory).sort();
  assert.deepEqual(
    actualDirectories,
    [...releaseDirectories].sort(),
    "Release must download each of the five immutable platform artifacts",
  );
  assert.ok(
    actualDirectories.every((name) =>
      lstatSync(path.join(inputDirectory, name)).isDirectory(),
    ),
    "Downloaded release artifacts must be platform directories",
  );
  assert.ok(
    !existsSync(outputDirectory),
    "Release output directory already exists",
  );
  mkdirSync(outputDirectory, { recursive: true });

  for (const arch of ["arm64", "x64"]) {
    const source = path.join(inputDirectory, `installers-mac-${arch}`);
    copyUnique(
      source,
      assertMacArtifact(source, version, arch),
      outputDirectory,
    );
  }
  for (const [platform, names] of [
    ["win-x64", [`Copper-Setup-${version}-x64.exe`]],
    [
      "linux-x64",
      [`Copper-${version}-x86_64.AppImage`, `copper_${version}_amd64.deb`],
    ],
    [
      "linux-arm64",
      [`Copper-${version}-arm64.AppImage`, `copper_${version}_arm64.deb`],
    ],
  ]) {
    const source = path.join(inputDirectory, `installers-${platform}`);
    readArtifactDirectory(source, names, platform);
    copyUnique(source, names, outputDirectory);
  }
  mergeUpdateMetadata(
    path.join(inputDirectory, "installers-mac-arm64"),
    path.join(inputDirectory, "installers-mac-x64"),
    outputDirectory,
    version,
  );
  const files = readdirSync(outputDirectory).sort();
  writeFileSync(
    path.join(outputDirectory, "SHA256SUMS"),
    checksumLines(outputDirectory, files),
  );
  verifyReleaseArtifacts(outputDirectory, version);
  return files;
}

function currentVersion() {
  const packageFile = new URL("../apps/desktop/package.json", import.meta.url);
  return JSON.parse(readFileSync(packageFile, "utf8")).version;
}

function environmentValue(name) {
  return process.env[name];
}

function assertReleaseTag(version) {
  assert.equal(
    environmentValue("GITHUB_REF_NAME"),
    `v${version}`,
    "Release tag must match the desktop package version",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const command = process.argv[2];
  const version = currentVersion();
  assertReleaseTag(version);
  if (command === "collect") {
    const [inputDirectory, outputDirectory] = process.argv.slice(3);
    assert.ok(inputDirectory, "Downloaded artifact directory is required");
    assert.ok(outputDirectory, "Release output directory is required");
    const files = mergeReleaseArtifacts(
      inputDirectory,
      outputDirectory,
      version,
    );
    console.log(`Verified ${files.length} release assets and wrote SHA256SUMS`);
  } else if (command === "verify") {
    const [directory] = process.argv.slice(3);
    assert.ok(directory, "Release directory is required");
    verifyReleaseArtifacts(directory, version);
    console.log("Complete release asset set and SHA256SUMS verified");
  } else {
    throw new Error(
      "Usage: node scripts/release-artifacts.mjs collect <downloads> <output> | verify <release-dir>",
    );
  }
}
