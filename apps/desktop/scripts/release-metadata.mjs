import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const metadataFilename = "latest-mac.yml";
const architectures = ["arm64", "x64"];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMetadata(directory, version) {
  const file = path.join(directory, metadataFilename);
  if (!fs.existsSync(file)) throw new Error("Missing macOS update metadata");
  const data = YAML.parse(fs.readFileSync(file, "utf8"));
  if (
    data?.version !== version ||
    !Array.isArray(data.files) ||
    data.files.length === 0
  )
    throw new Error("Invalid macOS update metadata version/files");
  return data;
}

function verifyFileEntry(directory, entry, version, expectedArch) {
  const match =
    typeof entry.url === "string" &&
    entry.url.match(
      new RegExp(
        `^Copper-${escapeRegex(version)}-mac-(arm64|x64)\\.(zip|dmg)$`,
      ),
    );
  if (
    !match ||
    path.basename(entry.url) !== entry.url ||
    entry.url.includes("\\") ||
    entry.url.includes("\0") ||
    (expectedArch && match[1] !== expectedArch)
  )
    throw new Error("Unsafe or mismatched macOS update artifact path");
  if (
    !Number.isSafeInteger(entry.size) ||
    entry.size <= 0 ||
    typeof entry.sha512 !== "string"
  )
    throw new Error("Invalid macOS update artifact checksum metadata");
  const bytes = fs.readFileSync(path.join(directory, entry.url));
  if (
    createHash("sha512").update(bytes).digest("base64") !== entry.sha512 ||
    bytes.length !== entry.size
  )
    throw new Error("Mac update artifact checksum/size mismatch");

  const artifacts = [entry.url];
  const blockmap = `${entry.url}.blockmap`;
  const blockmapPath = path.join(directory, blockmap);
  if (entry.url.endsWith(".zip")) {
    if (!fs.existsSync(blockmapPath) || fs.statSync(blockmapPath).size === 0)
      throw new Error(`Missing macOS update blockmap: ${blockmap}`);
  }
  if (fs.existsSync(blockmapPath)) {
    const blockmapSize = fs.statSync(blockmapPath).size;
    if (
      blockmapSize === 0 ||
      (entry.blockMapSize !== undefined && entry.blockMapSize !== blockmapSize)
    )
      throw new Error(`Mac update blockmap size mismatch: ${blockmap}`);
    artifacts.push(blockmap);
  } else if (entry.blockMapSize !== undefined) {
    throw new Error(`Missing macOS update blockmap: ${blockmap}`);
  }
  return artifacts;
}

export function validateUpdateMetadata(directory, version, arch) {
  const data = parseMetadata(directory, version);
  if (arch && !architectures.includes(arch))
    throw new Error(`Unsupported macOS architecture: ${arch}`);
  const entries = data.files.map((entry) =>
    verifyFileEntry(directory, entry, version, arch),
  );
  if (data.files.some((entry) => !entry.url.endsWith(".zip")))
    throw new Error("Mac update metadata may contain only ZIP artifacts");
  const zipEntries = data.files.filter((entry) => entry.url.endsWith(".zip"));
  const requiredArches = arch ? [arch] : architectures;
  for (const requiredArch of requiredArches) {
    const count = zipEntries.filter((entry) =>
      entry.url.includes(`-mac-${requiredArch}.`),
    ).length;
    if (count !== 1)
      throw new Error(`Expected one macOS update ZIP for ${requiredArch}`);
  }
  if (zipEntries.length !== requiredArches.length)
    throw new Error("Unexpected macOS update ZIP architecture");

  const knownArtifacts = new Set(entries.flat());
  return [metadataFilename, ...knownArtifacts].sort();
}

export function normalizeMacUpdateMetadata(directory, version, arch) {
  const data = parseMetadata(directory, version);
  if (!architectures.includes(arch))
    throw new Error(`Unsupported macOS architecture: ${arch}`);
  const expectedName = new RegExp(
    `^Copper-${escapeRegex(version)}-mac-${arch}\\.(zip|dmg)$`,
  );
  for (const entry of data.files) {
    if (
      typeof entry.url !== "string" ||
      !expectedName.test(entry.url) ||
      path.basename(entry.url) !== entry.url
    )
      throw new Error("Unsafe or mismatched macOS update artifact path");
  }
  const zipEntries = data.files.filter((entry) => entry.url.endsWith(".zip"));
  if (zipEntries.length !== 1)
    throw new Error(`Expected one macOS update ZIP for ${arch}`);

  const imageBlockmap = path.join(
    directory,
    `Copper-${version}-mac-${arch}.dmg.blockmap`,
  );
  fs.rmSync(imageBlockmap, { force: true });
  const normalized = {
    version,
    files: zipEntries,
    ...(typeof data.releaseDate === "string"
      ? { releaseDate: data.releaseDate }
      : {}),
  };
  fs.writeFileSync(
    path.join(directory, metadataFilename),
    YAML.stringify(normalized, { lineWidth: 0 }),
  );
  return validateUpdateMetadata(directory, version, arch);
}

export function mergeUpdateMetadata(
  arm64Directory,
  x64Directory,
  outputDirectory,
  version,
) {
  const arm64 = parseMetadata(arm64Directory, version);
  const x64 = parseMetadata(x64Directory, version);
  const files = [...arm64.files, ...x64.files].sort((left, right) =>
    left.url.localeCompare(right.url),
  );
  const names = files.map((entry) => entry.url);
  if (new Set(names).size !== names.length)
    throw new Error("Duplicate macOS update artifact names");

  const releaseDates = [arm64.releaseDate, x64.releaseDate]
    .filter((date) => typeof date === "string")
    .sort();
  const merged = { version, files };
  if (releaseDates.length) merged.releaseDate = releaseDates.at(-1);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, metadataFilename),
    YAML.stringify(merged, { lineWidth: 0 }),
  );
  return validateUpdateMetadata(outputDirectory, version);
}
