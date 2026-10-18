import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import YAML from "yaml";
import {
  expectedInstallers,
  mergeReleaseArtifacts,
  verifyInstallers,
  verifyReleaseArtifacts,
} from "../../../../scripts/release-artifacts.mjs";
import { assertDraftRelease } from "../../scripts/publish-release.mjs";
import { validateUpdateMetadata } from "../../scripts/release-metadata.mjs";

const version = "1.2.3";

function writeMacArtifact(directory: string, arch: "arm64" | "x64") {
  fs.mkdirSync(directory, { recursive: true });
  const zip = `Copper-${version}-mac-${arch}.zip`;
  const dmg = `Copper-${version}-mac-${arch}.dmg`;
  const zipBytes = Buffer.from(`signed-zip-${arch}`);
  const dmgBytes = Buffer.from(`signed-dmg-${arch}`);
  const zipBlockmap = Buffer.from(`zip-blockmap-${arch}`);
  fs.writeFileSync(path.join(directory, zip), zipBytes);
  fs.writeFileSync(path.join(directory, `${zip}.blockmap`), zipBlockmap);
  fs.writeFileSync(path.join(directory, dmg), dmgBytes);
  fs.writeFileSync(
    path.join(directory, "latest-mac.yml"),
    JSON.stringify({
      version,
      releaseDate: "2026-01-01T00:00:00.000Z",
      path: zip,
      sha512: createHash("sha512").update(zipBytes).digest("base64"),
      files: [
        {
          url: zip,
          size: zipBytes.length,
          sha512: createHash("sha512").update(zipBytes).digest("base64"),
          blockMapSize: zipBlockmap.length,
        },
      ],
    }),
  );
}

function createArtifactInput(root: string) {
  const input = path.join(root, "downloaded");
  writeMacArtifact(path.join(input, "installers-mac-arm64"), "arm64");
  const files = {
    "installers-win-x64": [`Copper-Setup-${version}-x64.exe`],
    "installers-linux-arm64": [
      `Copper-${version}-arm64.AppImage`,
      `copper_${version}_arm64.deb`,
    ],
    "installers-linux-x64": [
      `Copper-${version}-x86_64.AppImage`,
      `copper_${version}_amd64.deb`,
    ],
  };
  for (const [directory, names] of Object.entries(files)) {
    const output = path.join(input, directory);
    fs.mkdirSync(output, { recursive: true });
    for (const name of names) fs.writeFileSync(path.join(output, name), name);
  }
  return input;
}

it("requires all platform installers before creating release checksums", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-installers-"),
  );
  try {
    const names = expectedInstallers(version);
    expect(names).toHaveLength(7);
    expect(() => verifyInstallers(directory, version)).toThrow();
    for (const name of names)
      fs.writeFileSync(path.join(directory, name), "fixture");
    expect(
      verifyInstallers(directory, version).trim().split("\n"),
    ).toHaveLength(7);
    fs.writeFileSync(path.join(directory, names[0]), "");
    expect(() => verifyInstallers(directory, version)).toThrow(
      /Empty release artifact/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it("only permits a matching draft with a readable asset list to publish", () => {
  expect(() =>
    assertDraftRelease(
      { tagName: "v1.2.3", isDraft: true, assets: [] },
      "v1.2.3",
    ),
  ).not.toThrow();
  expect(() =>
    assertDraftRelease(
      { tagName: "v1.2.2", isDraft: true, assets: [] },
      "v1.2.3",
    ),
  ).toThrow(/unpublished draft/);
  expect(() =>
    assertDraftRelease(
      { tagName: "v1.2.3", isDraft: false, assets: [] },
      "v1.2.3",
    ),
  ).toThrow(/unpublished draft/);
  expect(() =>
    assertDraftRelease({ tagName: "v1.2.3", isDraft: true }, "v1.2.3"),
  ).toThrow(/asset list/);
});

it("collects Apple Silicon macOS and Windows/Linux assets with verified metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-release-assets-"));
  const input = createArtifactInput(root);
  const output = path.join(root, "final");
  try {
    const assets = mergeReleaseArtifacts(input, output, version);
    expect(assets).toHaveLength(9);
    const metadata: {
      files: Array<{ url: string }>;
      path?: string;
      sha512?: string;
    } = YAML.parse(
      fs.readFileSync(path.join(output, "latest-mac.yml"), "utf8"),
    );
    expect(metadata.files.map((file) => file.url)).toEqual([
      `Copper-${version}-mac-arm64.zip`,
    ]);
    expect(metadata.path).toBeUndefined();
    expect(metadata.sha512).toBeUndefined();
    expect(verifyReleaseArtifacts(output, version)).toContain("latest-mac.yml");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it("rejects missing update blockmaps, tampering, and extra release files", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-release-invalid-"),
  );
  const input = createArtifactInput(root);
  const output = path.join(root, "final");
  try {
    mergeReleaseArtifacts(input, output, version);
    fs.rmSync(path.join(output, `Copper-${version}-mac-arm64.zip.blockmap`));
    expect(() => verifyReleaseArtifacts(output, version)).toThrow(/blockmap/);
    fs.writeFileSync(
      path.join(output, `Copper-${version}-mac-arm64.zip.blockmap`),
      "zip-blockmap-arm64",
    );
    fs.appendFileSync(path.join(output, "SHA256SUMS"), "tampered\n");
    expect(() => verifyReleaseArtifacts(output, version)).toThrow(/SHA256SUMS/);

    const extraOutput = path.join(root, "with-extra-file");
    mergeReleaseArtifacts(input, extraOutput, version);
    fs.writeFileSync(
      path.join(extraOutput, `Copper-${version}-mac-arm64.dmg.blockmap`),
      "stale after stapling",
    );
    expect(() => verifyReleaseArtifacts(extraOutput, version)).toThrow(
      /no unexpected files/i,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it("rejects Intel Mac artifacts and Intel update metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-intel-rejected-"));
  try {
    const input = createArtifactInput(root);
    const intel = path.join(input, "installers-mac-x64");
    writeMacArtifact(intel, "x64");
    expect(() =>
      mergeReleaseArtifacts(input, path.join(root, "final"), version),
    ).toThrow(/four immutable platform artifacts/);
    expect(() => validateUpdateMetadata(intel, version)).toThrow(/mismatched/);
    expect(() => validateUpdateMetadata(intel, version, "x64")).toThrow(
      /Unsupported/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
