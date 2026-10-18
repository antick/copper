import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export {
  mergeUpdateMetadata,
  normalizeMacUpdateMetadata,
  validateUpdateMetadata,
} from "./release-metadata.mjs";
export { assertReleaseProtections } from "./release-protection-policy.mjs";

export const signingVariables = [
  "MACOS_CERTIFICATE_P12",
  "MACOS_CERTIFICATE_PASSWORD",
  "APPLE_API_KEY_P8",
  "APPLE_API_KEY_ID",
  "APPLE_API_ISSUER",
  "APPLE_TEAM_ID",
];

const appleTeamPattern = /^[A-Z0-9]{10}$/;
const developerIdPrefix = "Developer ID Application: ";
const signingDirectoryName = "copper-release-signing";
const searchListFilename = "keychain-search-list.json";
const keychainFilename = "release.keychain-db";
const appleDeveloperIdIntermediateSha256 =
  "F16CD3C54C7F83CEA4BF1A3E6A0819C8AAA8E4A1528FD144715F350643D2DF3A";

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
  } catch {
    throw new Error(`${command} ${args[0] ?? ""} failed; release stopped`);
  }
}

function requireValues(env, names) {
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length)
    throw new Error(`Release blocked: missing ${missing.join(", ")}`);
}

function validateNotarization(env, { allowP8Secret = false } = {}) {
  const hasAppleId =
    env.APPLE_ID?.trim() &&
    env.APPLE_APP_SPECIFIC_PASSWORD?.trim() &&
    env.APPLE_TEAM_ID?.trim();
  const hasApiKey =
    env.APPLE_API_KEY?.trim() &&
    env.APPLE_API_KEY_ID?.trim() &&
    env.APPLE_API_ISSUER?.trim() &&
    fs.existsSync(env.APPLE_API_KEY);
  const hasApiKeySecret =
    allowP8Secret &&
    env.APPLE_API_KEY_P8?.trim() &&
    env.APPLE_API_KEY_ID?.trim() &&
    env.APPLE_API_ISSUER?.trim();
  const hasKeychainProfile =
    env.APPLE_KEYCHAIN_PROFILE?.trim() && env.APPLE_TEAM_ID?.trim();
  if (!hasAppleId && !hasApiKey && !hasApiKeySecret && !hasKeychainProfile)
    throw new Error(
      "Release blocked: complete Apple notarization credentials are required",
    );
}

export function requireReleaseCredentials(env, options = {}) {
  requireValues(env, ["APPLE_TEAM_ID"]);
  if (!appleTeamPattern.test(env.APPLE_TEAM_ID))
    throw new Error("Release blocked: invalid Apple team identifier");
  const hasLocalIdentity = Boolean(env.CSC_NAME?.trim());
  const hasLocalCertificate = Boolean(
    env.CSC_LINK?.trim() && env.CSC_KEY_PASSWORD?.trim(),
  );
  const hasPreparedCertificate = Boolean(
    env.MACOS_CERTIFICATE_P12?.trim() && env.MACOS_CERTIFICATE_PASSWORD?.trim(),
  );
  if (!hasLocalIdentity && !hasLocalCertificate && !hasPreparedCertificate)
    throw new Error(
      "Release blocked: a Developer ID signing identity or certificate is required",
    );
  if (
    env.MACOS_CERTIFICATE_P12?.trim() &&
    !env.MACOS_CERTIFICATE_PASSWORD?.trim()
  )
    throw new Error("Release blocked: MACOS_CERTIFICATE_PASSWORD is missing");
  if (env.CSC_LINK?.trim() && !env.CSC_KEY_PASSWORD?.trim())
    throw new Error("Release blocked: CSC_KEY_PASSWORD is missing");
  validateNotarization(env, options);
  if (
    env.CSC_IDENTITY_AUTO_DISCOVERY === "false" &&
    !hasLocalIdentity &&
    !hasPreparedCertificate
  )
    throw new Error("Release blocked: signing identity discovery is disabled");
}

export function signingIdentity(output, teamId) {
  if (!appleTeamPattern.test(teamId ?? ""))
    throw new Error("APPLE_TEAM_ID must be a 10-character Apple team ID");
  const identities = [
    ...new Set(
      [...output.matchAll(/\d+\)\s+[0-9A-F]+\s+"([^"]+)"/g)]
        .map((match) => match[1])
        .filter(
          (name) =>
            name.startsWith(developerIdPrefix) && name.endsWith(`(${teamId})`),
        ),
    ),
  ];
  if (identities.length !== 1)
    throw new Error(
      "Expected exactly one Developer ID Application certificate for this team",
    );
  return identities[0];
}

export function verifySigningIdentity(env = process.env) {
  requireValues(env, ["APPLE_TEAM_ID"]);
  if (env.CSC_LINK?.trim()) return;
  if (!env.CSC_NAME?.trim())
    throw new Error(
      "Release blocked: explicit CSC_NAME signing identity is required",
    );
  const args = ["find-identity", "-v", "-p", "codesigning"];
  if (env.CSC_KEYCHAIN?.trim()) args.push(env.CSC_KEYCHAIN);
  const identity = signingIdentity(run("security", args), env.APPLE_TEAM_ID);
  const qualifier = identity.slice(developerIdPrefix.length);
  const configuredIdentity = env.CSC_NAME.startsWith(developerIdPrefix)
    ? env.CSC_NAME.slice(developerIdPrefix.length)
    : env.CSC_NAME;
  if (qualifier !== configuredIdentity)
    throw new Error("CSC_NAME does not match the verified Apple team identity");
}

export function keychainSearchList(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function verifyAppleDeveloperIdIntermediate(certificatePath) {
  const fingerprint = createHash("sha256")
    .update(fs.readFileSync(certificatePath))
    .digest("hex")
    .toUpperCase();
  if (fingerprint !== appleDeveloperIdIntermediateSha256)
    throw new Error(
      "Bundled Apple Developer ID intermediate certificate is invalid",
    );
}

function signingPaths(env) {
  const directory =
    env.COPPER_SIGNING_DIRECTORY ||
    path.join(env.RUNNER_TEMP || os.tmpdir(), signingDirectoryName);
  return {
    directory,
    keychain: path.join(directory, keychainFilename),
    apiKey: path.join(directory, "AuthKey.p8"),
    searchList: path.join(directory, searchListFilename),
  };
}

function restoreSigningSearchList(keychain, searchList) {
  run("security", ["list-keychains", "-d", "user", "-s", ...searchList]);
  if (fs.existsSync(keychain)) run("security", ["delete-keychain", keychain]);
}

export function prepareReleaseSigning(env = process.env) {
  if (process.platform !== "darwin")
    throw new Error("macOS release signing requires a Mac");
  requireReleaseCredentials(env, { allowP8Secret: true });
  requireValues(env, ["RUNNER_TEMP", "GITHUB_ENV", ...signingVariables]);
  if (!env.APPLE_API_KEY_P8.includes("-----BEGIN PRIVATE KEY-----"))
    throw new Error("Release blocked: APPLE_API_KEY_P8 is not a PEM key");

  const directory = path.join(
    env.RUNNER_TEMP,
    `${signingDirectoryName}-${randomBytes(6).toString("hex")}`,
  );
  const keychain = path.join(directory, keychainFilename);
  const apiKey = path.join(directory, "AuthKey.p8");
  const searchListFile = path.join(directory, searchListFilename);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  let previousSearchList = [];
  let searchListSaved = false;
  let keychainCreated = false;
  try {
    previousSearchList = keychainSearchList(
      run("security", ["list-keychains", "-d", "user"]),
    );
    fs.writeFileSync(searchListFile, JSON.stringify(previousSearchList), {
      mode: 0o600,
    });
    searchListSaved = true;
    const certificate = path.join(directory, "certificate.p12");
    const intermediate = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../build/DeveloperIDG2CA.cer",
    );
    verifyAppleDeveloperIdIntermediate(intermediate);
    fs.writeFileSync(
      certificate,
      Buffer.from(env.MACOS_CERTIFICATE_P12, "base64"),
      { mode: 0o600 },
    );
    fs.writeFileSync(apiKey, env.APPLE_API_KEY_P8, { mode: 0o600 });
    const password = randomBytes(32).toString("hex");
    run("security", ["create-keychain", "-p", password, keychain]);
    keychainCreated = true;
    run("security", ["set-keychain-settings", "-lut", "21600", keychain]);
    run("security", ["unlock-keychain", "-p", password, keychain]);
    run("security", [
      "list-keychains",
      "-d",
      "user",
      "-s",
      keychain,
      ...previousSearchList,
    ]);
    run("security", ["import", intermediate, "-k", keychain]);
    run("security", [
      "import",
      certificate,
      "-P",
      env.MACOS_CERTIFICATE_PASSWORD,
      "-k",
      keychain,
      "-T",
      "/usr/bin/codesign",
      "-T",
      "/usr/bin/security",
    ]);
    run("security", [
      "set-key-partition-list",
      "-S",
      "apple-tool:,apple:",
      "-s",
      "-k",
      password,
      keychain,
    ]);
    const identity = signingIdentity(
      run("security", ["find-identity", "-v", "-p", "codesigning", keychain]),
      env.APPLE_TEAM_ID,
    );
    const probe = path.join(directory, "signing-probe");
    fs.writeFileSync(`${probe}.c`, "int main(void) { return 0; }\n");
    run("xcrun", ["clang", `${probe}.c`, "-o", probe]);
    run("codesign", [
      "--force",
      "--timestamp",
      "--options",
      "runtime",
      "--sign",
      identity,
      "--keychain",
      keychain,
      probe,
    ]);
    run("codesign", ["--verify", "--strict", probe]);
    run(probe, []);
    fs.rmSync(probe, { force: true });
    fs.rmSync(`${probe}.c`, { force: true });
    fs.rmSync(certificate, { force: true });
    fs.appendFileSync(
      env.GITHUB_ENV,
      [
        `CSC_NAME=${identity.slice(developerIdPrefix.length)}`,
        `CSC_KEYCHAIN=${keychain}`,
        `APPLE_API_KEY=${apiKey}`,
        `COPPER_SIGNING_DIRECTORY=${directory}`,
        "",
      ].join("\n"),
    );
    console.log("Temporary Developer ID keychain is ready.");
  } catch (error) {
    if (searchListSaved) {
      try {
        restoreSigningSearchList(keychain, previousSearchList);
      } catch {
        // Preserve the original preparation error; cleanup runs again in the workflow.
      }
    } else if (keychainCreated) {
      try {
        run("security", ["delete-keychain", keychain]);
      } catch {
        // Cleanup runs again in the workflow.
      }
    }
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

export function cleanupReleaseSigning(env = process.env) {
  const { directory, keychain, searchList } = signingPaths(env);
  if (!fs.existsSync(directory)) return;
  let cleanupError;
  try {
    if (fs.existsSync(searchList)) {
      restoreSigningSearchList(
        keychain,
        JSON.parse(fs.readFileSync(searchList, "utf8")),
      );
    } else if (fs.existsSync(keychain)) {
      run("security", ["delete-keychain", keychain]);
    }
  } catch (error) {
    cleanupError = error;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  if (cleanupError) throw cleanupError;
}

export function verifySignedApp(appPath, appId, teamId) {
  run("codesign", ["--verify", "--deep", "--strict", appPath]);
  const identity = run("/bin/sh", [
    "-c",
    'exec codesign -dv --verbose=4 "$1" 2>&1',
    "verify",
    appPath,
  ]);
  if (
    !identity.includes(`Identifier=${appId}\n`) ||
    !identity.includes(`TeamIdentifier=${teamId}\n`) ||
    !identity.includes("Authority=Developer ID Application:") ||
    !identity.includes("runtime")
  )
    throw new Error("Release signing identity or hardened runtime is invalid");
  run("spctl", ["--assess", "--type", "exec", appPath]);
  run("xcrun", ["stapler", "validate", appPath]);
}
