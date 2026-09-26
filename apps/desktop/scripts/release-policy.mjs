import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const signingVariables = [
  "CSC_LINK",
  "CSC_KEY_PASSWORD",
  "APPLE_ID",
  "APPLE_APP_SPECIFIC_PASSWORD",
  "APPLE_TEAM_ID",
];

export function assertReleaseProtections(environment, policies, rulesets, ref) {
  if (
    !environment.protection_rules?.some(
      (rule) => rule.type === "required_reviewers" && rule.reviewers?.length,
    ) ||
    !environment.deployment_branch_policy?.custom_branch_policies ||
    policies.branch_policies?.length !== 1 ||
    policies.branch_policies[0].type !== "tag" ||
    policies.branch_policies[0].name !== "v*.*.*"
  )
    throw new Error("Release environment needs reviewers and only v*.*.* tags");
  if (!ref?.startsWith("refs/tags/v")) throw new Error("Invalid release tag");
  const matches = (pattern) =>
    pattern === "~ALL" || path.matchesGlob(ref, pattern);
  const protections = new Set(
    rulesets
      .filter(
        (rule) =>
          rule.target === "tag" &&
          rule.enforcement === "active" &&
          rule.conditions?.ref_name?.include?.some(matches) &&
          !rule.conditions.ref_name.exclude?.some(matches),
      )
      .flatMap((rule) => rule.rules?.map((item) => item.type) ?? []),
  );
  if (
    !["creation", "update", "deletion"].every((type) => protections.has(type))
  )
    throw new Error(
      "Release tag needs creation, update, and deletion protection",
    );
}
export function requireReleaseCredentials(env) {
  const missing = signingVariables.filter((key) => !env[key]?.trim());
  if (missing.length)
    throw new Error(`Release blocked: missing ${missing.join(", ")}`);
  if (env.CSC_IDENTITY_AUTO_DISCOVERY === "false")
    throw new Error("Release blocked: signing is disabled");
}

export function validateUpdateMetadata(directory, version) {
  const files = fs.readdirSync(directory);
  const metadata = files.filter(
    (file) => /^latest.*-mac\.yml$/.test(file) || file === "latest-mac.yml",
  );
  if (!metadata.length) throw new Error("Missing macOS update metadata");
  const artifacts = new Set();
  for (const name of metadata) {
    const data = YAML.parse(
      fs.readFileSync(path.join(directory, name), "utf8"),
    );
    if (
      data.version !== version ||
      !Array.isArray(data.files) ||
      !data.files.length
    )
      throw new Error("Invalid update metadata version/files");
    for (const entry of data.files) {
      if (
        typeof entry.url !== "string" ||
        path.basename(entry.url) !== entry.url ||
        !/\.(zip|dmg)$/.test(entry.url)
      )
        throw new Error("Unsafe update artifact path");
      const bytes = fs.readFileSync(path.join(directory, entry.url));
      if (
        createHash("sha512").update(bytes).digest("base64") !== entry.sha512 ||
        bytes.length !== entry.size
      )
        throw new Error("Update artifact checksum/size mismatch");
      artifacts.add(entry.url);
    }
    artifacts.add(name);
  }
  if (![...artifacts].some((name) => name.endsWith(".zip")))
    throw new Error("Missing update ZIP");
  return [...artifacts];
}

export function verifySignedApp(appPath, appId, teamId) {
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], {
    stdio: "pipe",
  });
  // codesign prints its identity to stderr even on success.
  const identity = execFileSync(
    "/bin/sh",
    ["-c", 'exec codesign -dv --verbose=4 "$1" 2>&1', "verify", appPath],
    { encoding: "utf8" },
  );
  if (
    !identity.includes(`Identifier=${appId}\n`) ||
    !identity.includes(`TeamIdentifier=${teamId}\n`) ||
    !identity.includes("Authority=Developer ID Application:") ||
    !identity.includes("runtime")
  )
    throw new Error("Release signing identity/runtime is invalid");
  execFileSync("spctl", ["--assess", "--type", "exec", appPath], {
    stdio: "pipe",
  });
  execFileSync("xcrun", ["stapler", "validate", appPath], { stdio: "pipe" });
}
