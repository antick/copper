import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  requireReleaseCredentials,
  validateUpdateMetadata,
  verifySignedApp,
} from "./release-policy.mjs";

requireReleaseCredentials(process.env);
if (process.platform !== "darwin")
  throw new Error("macOS releases must be built on macOS");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (process.env.GITHUB_REF_NAME !== `v${pkg.version}`)
  throw new Error("Release tag must match package version");
const run = (args) => execFileSync("pnpm", args, { stdio: "inherit" });
run(["exec", "electron-vite", "build"]);
// Isolated output prevents accidentally uploading a previous local test build.
const output = fs.mkdtempSync(path.resolve("release-production-"));
try {
  run([
    "exec",
    "electron-builder",
    "--mac",
    "--publish",
    "never",
    "-c.forceCodeSigning=true",
    "-c.mac.notarize=true",
    "-c.mac.hardenedRuntime=true",
    `-c.directories.output=${output}`,
  ]);
  const appDirectories = fs
    .readdirSync(output)
    .filter((name) => name === "mac" || name.startsWith("mac-"));
  if (!appDirectories.length) throw new Error("Release app bundle is missing");
  for (const directory of appDirectories)
    verifySignedApp(
      path.join(output, directory, `${pkg.productName}.app`),
      pkg.build.appId,
      process.env.APPLE_TEAM_ID,
    );
  const artifacts = validateUpdateMetadata(output, pkg.version);
  for (const name of artifacts.filter((file) => file.endsWith(".dmg"))) {
    execFileSync("hdiutil", ["verify", path.join(output, name)], {
      stdio: "pipe",
    });
  }
  fs.mkdirSync("release-verified", { recursive: true });
  for (const name of artifacts)
    fs.copyFileSync(
      path.join(output, name),
      path.join("release-verified", name),
    );
  fs.writeFileSync(
    "release-verified/artifacts.json",
    JSON.stringify(artifacts),
  );
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
