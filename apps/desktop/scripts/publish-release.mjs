import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyReleaseArtifacts } from "../../../scripts/release-artifacts.mjs";

const desktopDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(desktopDirectory, "package.json"), "utf8"),
);

export function assertDraftRelease(release, tag) {
  if (release.tagName !== tag || release.isDraft !== true)
    throw new Error(
      "Only the matching, unpublished draft release can be published",
    );
  if (!Array.isArray(release.assets))
    throw new Error("Draft release asset list is unavailable");
}

function runGh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function publishDraft(tag, repository, version) {
  if (process.env.GITHUB_ACTIONS === "true")
    throw new Error(
      "Draft publication is a deliberate local maintainer action",
    );
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-release-publish-"),
  );
  try {
    const release = JSON.parse(
      runGh([
        "release",
        "view",
        tag,
        "--repo",
        repository,
        "--json",
        "tagName,isDraft,assets",
      ]),
    );
    assertDraftRelease(release, tag);
    runGh([
      "release",
      "download",
      tag,
      "--repo",
      repository,
      "--dir",
      directory,
    ]);
    verifyReleaseArtifacts(directory, version);
    const downloaded = fs.readdirSync(directory).sort();
    const remote = release.assets.map((asset) => asset.name).sort();
    assert.deepEqual(
      remote,
      downloaded,
      "Draft assets must exactly match the verified download",
    );
    for (const asset of release.assets) {
      if (fs.statSync(path.join(directory, asset.name)).size !== asset.size)
        throw new Error(`Draft asset size changed: ${asset.name}`);
    }
    runGh(["release", "edit", tag, "--repo", repository, "--draft=false"]);
    console.log(
      `Published ${tag} after verifying ${downloaded.length - 1} assets.`,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function main(env = process.env) {
  const tag = env.GITHUB_REF_NAME || `v${packageJson.version}`;
  if (tag !== `v${packageJson.version}`)
    throw new Error("Release tag must match the desktop package version");
  const repository =
    env.GH_REPO ||
    `${packageJson.build.publish.owner}/${packageJson.build.publish.repo}`;
  publishDraft(tag, repository, packageJson.version);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
