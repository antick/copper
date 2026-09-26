import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validateUpdateMetadata } from "./release-policy.mjs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tag = `v${pkg.version}`;
if (process.env.GITHUB_REF_NAME !== tag || !process.env.GH_TOKEN)
  throw new Error(
    "Publication needs the verified release tag and upload credential",
  );
const directory = "release-verified";
const artifacts = validateUpdateMetadata(directory, pkg.version).map((name) =>
  path.join(directory, name),
);
const repository = `${pkg.build.publish.owner}/${pkg.build.publish.repo}`;
// Create a draft first. A failed upload cannot advertise a partial update.
execFileSync(
  "gh",
  [
    "release",
    "create",
    tag,
    ...artifacts,
    "--repo",
    repository,
    "--draft",
    "--title",
    `Copper ${pkg.version}`,
    "--notes",
    `Copper ${pkg.version}`,
  ],
  { stdio: "inherit" },
);
execFileSync(
  "gh",
  ["release", "edit", tag, "--repo", repository, "--draft=false"],
  { stdio: "inherit" },
);
