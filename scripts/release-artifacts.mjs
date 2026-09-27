import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function expectedInstallers(version) {
  return [
    ...["arm64", "x64"].flatMap((arch) =>
      ["dmg", "zip"].map((ext) => `Copper-${version}-mac-${arch}.${ext}`),
    ),
    `Copper-Setup-${version}-x64.exe`,
    ...["x86_64", "arm64"].map((arch) => `Copper-${version}-${arch}.AppImage`),
    ...["amd64", "arm64"].map((arch) => `copper_${version}_${arch}.deb`),
  ].sort();
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
  return `${expected
    .map((name) => {
      const bytes = readFileSync(resolve(directory, name));
      assert.ok(bytes.length > 0, `Empty installer: ${name}`);
      return `${createHash("sha256").update(bytes).digest("hex")}  ${name}`;
    })
    .join("\n")}\n`;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { version } = JSON.parse(
    readFileSync(
      new URL("../apps/desktop/package.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Invoked directly by release CI, never cached by Turbo.
    process.env.GITHUB_REF_NAME,
    `v${version}`,
    "Tag must match app version",
  );
  const directory = process.argv[2];
  assert.ok(directory, "Installer directory is required");
  writeFileSync(
    resolve(directory, "SHA256SUMS"),
    verifyInstallers(directory, version),
  );
}
