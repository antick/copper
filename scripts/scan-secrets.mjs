import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const config = JSON.parse(
  fs.readFileSync(new URL("./security-tools.json", import.meta.url), "utf8"),
).gitleaks;
const platform = `${process.platform}-${process.arch}`;
if (!config[platform])
  throw new Error(`Secret scanning is not configured for ${platform}`);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "copper-secret-scan-"));
try {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const name = `gitleaks_${config.version}_${process.platform}_${arch}.tar.gz`;
  const response = await fetch(
    `https://github.com/gitleaks/gitleaks/releases/download/v${config.version}/${name}`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!response.ok)
    throw new Error("Could not download the pinned secret scanner");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== config[platform])
    throw new Error("Secret scanner checksum mismatch");
  const archive = path.join(temp, "scanner.tar.gz");
  fs.writeFileSync(archive, bytes);
  execFileSync("tar", ["-xzf", archive, "-C", temp, "gitleaks"]);
  const scanner = path.join(temp, "gitleaks");
  const current = path.join(temp, "current");
  fs.mkdirSync(current);
  const files = execFileSync(
    "git",
    [
      "-c",
      "core.fsmonitor=false",
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  )
    .split("\0")
    .filter(Boolean);
  for (const file of new Set(files)) {
    if (!fs.existsSync(file)) continue;
    const destination = path.join(current, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.lstatSync(file).isSymbolicLink())
      fs.writeFileSync(destination, fs.readlinkSync(file));
    else fs.copyFileSync(file, destination);
  }
  let failed = false;
  for (const [kind, target, extra] of [
    ["git", ".", ["--log-opts=--all"]],
    ["dir", current, []],
  ]) {
    const report = path.join(temp, `${kind}.json`);
    try {
      execFileSync(
        scanner,
        [
          kind,
          target,
          ...extra,
          "--redact=100",
          "--no-banner",
          "--report-format=json",
          `--report-path=${report}`,
        ],
        { stdio: "pipe" },
      );
    } catch {
      failed = true;
    }
    if (!fs.existsSync(report))
      throw new Error(`Secret scanner failed without a report (${kind})`);
    const findings = JSON.parse(fs.readFileSync(report, "utf8"));
    // Never print matched lines or secret values, including redacted snippets.
    console.log(`${kind}: ${findings.length} potential secrets`);
    for (const finding of findings)
      console.log(
        JSON.stringify({
          rule: finding.RuleID,
          file: finding.File,
          line: finding.StartLine,
          commit: finding.Commit,
        }),
      );
    if (findings.length) failed = true;
  }
  if (failed) process.exitCode = 1;
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
