import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import YAML from "yaml";
import {
  assertReleaseProtections,
  keychainSearchList,
  normalizeMacUpdateMetadata,
  requireReleaseCredentials,
  signingIdentity,
  validateUpdateMetadata,
  verifyAppleDeveloperIdIntermediate,
} from "../../scripts/release-policy.mjs";

const teamId = "2L85KT5GNL";

function protectedTagRules() {
  return {
    environment: {
      protection_rules: [
        {
          type: "required_reviewers",
          reviewers: [{}],
          prevent_self_review: false,
        },
      ],
      deployment_branch_policy: { custom_branch_policies: true },
    },
    policies: { branch_policies: [{ type: "tag", name: "v*.*.*" }] },
    rulesets: [
      {
        target: "tag",
        enforcement: "active",
        conditions: {
          ref_name: { include: ["refs/tags/v*.*.*"], exclude: [] },
        },
        rules: ["creation", "update", "deletion"].map((type) => ({ type })),
      },
    ],
  };
}

it("requires reviewer approval and immutable version tags", () => {
  const config = protectedTagRules();
  expect(() =>
    assertReleaseProtections(
      config.environment,
      config.policies,
      config.rulesets,
      "refs/tags/v1.0.0",
    ),
  ).not.toThrow();
  expect(() =>
    assertReleaseProtections(
      { ...config.environment, protection_rules: [] },
      config.policies,
      config.rulesets,
      "refs/tags/v1.0.0",
    ),
  ).toThrow(/reviewers/);
  expect(() =>
    assertReleaseProtections(
      {
        ...config.environment,
        protection_rules: [
          {
            type: "required_reviewers",
            reviewers: [{}],
            prevent_self_review: true,
          },
        ],
      },
      config.policies,
      config.rulesets,
      "refs/tags/v1.0.0",
    ),
  ).not.toThrow();
  expect(() =>
    assertReleaseProtections(
      config.environment,
      config.policies,
      [{ ...config.rulesets[0], rules: [] }],
      "refs/tags/v1.0.0",
    ),
  ).toThrow(/creation, update, and deletion/);
  expect(() =>
    assertReleaseProtections(
      config.environment,
      { branch_policies: [{ type: "branch", name: "main" }] },
      config.rulesets,
      "refs/tags/v1.0.0",
    ),
  ).toThrow(/reviewers/);
  expect(() =>
    assertReleaseProtections(
      config.environment,
      config.policies,
      config.rulesets,
      "refs/tags/other",
    ),
  ).toThrow(/tag/);
});

it("accepts a complete local identity and API key and rejects missing signing", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "copper-release-"));
  const apiKey = path.join(directory, "AuthKey.p8");
  fs.writeFileSync(apiKey, "local test key");
  try {
    expect(() => requireReleaseCredentials({})).toThrow(/Release blocked/);
    expect(() =>
      requireReleaseCredentials({
        APPLE_TEAM_ID: teamId,
        CSC_IDENTITY_AUTO_DISCOVERY: "false",
        APPLE_ID: "release@example.test",
        APPLE_APP_SPECIFIC_PASSWORD: "password",
      }),
    ).toThrow(/signing identity/);

    expect(() =>
      requireReleaseCredentials({
        CSC_NAME: "Pankaj Sanam (2L85KT5GNL)",
        APPLE_TEAM_ID: teamId,
        APPLE_API_KEY: apiKey,
        APPLE_API_KEY_ID: "test-key-id",
        APPLE_API_ISSUER: "test-issuer",
        CSC_IDENTITY_AUTO_DISCOVERY: "false",
      }),
    ).not.toThrow();

    expect(() =>
      requireReleaseCredentials(
        {
          MACOS_CERTIFICATE_P12: "encoded-certificate",
          MACOS_CERTIFICATE_PASSWORD: "certificate-password",
          APPLE_API_KEY_P8: "-----BEGIN PRIVATE KEY----- test",
          APPLE_API_KEY_ID: "test-key-id",
          APPLE_API_ISSUER: "test-issuer",
          APPLE_TEAM_ID: teamId,
        },
        { allowP8Secret: true },
      ),
    ).not.toThrow();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it("deduplicates the same identity across keychains and parses search lists", () => {
  const name = `Developer ID Application: Pankaj Sanam (${teamId})`;
  const identity = signingIdentity(
    `1) AAAAAAAA "${name}"\n2) BBBBBBBB "${name}"\n`,
    teamId,
  );
  expect(identity).toBe(name);
  expect(
    keychainSearchList('"/tmp/one.keychain-db"\n"/tmp/two.keychain-db"\n'),
  ).toEqual(["/tmp/one.keychain-db", "/tmp/two.keychain-db"]);
  expect(() => signingIdentity(`1) AAAAAAAA "${name}"`, "WRONGTEAM1")).toThrow(
    /exactly one/,
  );
});

it("imports only the pinned Apple Developer ID intermediate certificate", () => {
  const certificatePath = fileURLToPath(
    new URL("../../build/DeveloperIDG2CA.cer", import.meta.url),
  );
  expect(() =>
    verifyAppleDeveloperIdIntermediate(certificatePath),
  ).not.toThrow();

  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-certificate-"),
  );
  const tampered = path.join(directory, "untrusted.cer");
  fs.writeFileSync(tampered, "not the Apple certificate");
  try {
    expect(() => verifyAppleDeveloperIdIntermediate(tampered)).toThrow(
      /invalid/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it("drops stapled DMG metadata and its stale blockmap while preserving the update ZIP", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-update-meta-"),
  );
  const version = "1.2.3";
  const arch = "arm64";
  const zipName = `Copper-${version}-mac-${arch}.zip`;
  const dmgName = `Copper-${version}-mac-${arch}.dmg`;
  const zip = Buffer.from("signed update archive");
  const dmgBeforeStapling = Buffer.from("signed image before stapling");
  const dmgAfterStapling = Buffer.from("signed image after stapling");
  const zipBlockmap = Buffer.from("valid zip blockmap");
  const dmgBlockmap = Buffer.from("stale dmg blockmap");
  const checksum = (bytes: Buffer) =>
    createHash("sha512").update(bytes).digest("base64");

  try {
    fs.writeFileSync(path.join(directory, zipName), zip);
    fs.writeFileSync(path.join(directory, `${zipName}.blockmap`), zipBlockmap);
    fs.writeFileSync(path.join(directory, dmgName), dmgBeforeStapling);
    fs.writeFileSync(path.join(directory, `${dmgName}.blockmap`), dmgBlockmap);
    fs.writeFileSync(
      path.join(directory, "latest-mac.yml"),
      YAML.stringify({
        version,
        path: dmgName,
        sha512: checksum(dmgBeforeStapling),
        files: [
          {
            url: zipName,
            size: zip.length,
            sha512: checksum(zip),
            blockMapSize: zipBlockmap.length,
          },
          {
            url: dmgName,
            size: dmgBeforeStapling.length,
            sha512: checksum(dmgBeforeStapling),
            blockMapSize: dmgBlockmap.length,
          },
        ],
      }),
    );

    fs.writeFileSync(path.join(directory, dmgName), dmgAfterStapling);
    expect(() => validateUpdateMetadata(directory, version, arch)).toThrow(
      /checksum\/size mismatch/,
    );

    expect(normalizeMacUpdateMetadata(directory, version, arch)).toEqual([
      "Copper-1.2.3-mac-arm64.zip",
      "Copper-1.2.3-mac-arm64.zip.blockmap",
      "latest-mac.yml",
    ]);
    const metadata: {
      files: Array<{ url: string }>;
      path?: string;
      sha512?: string;
    } = YAML.parse(
      fs.readFileSync(path.join(directory, "latest-mac.yml"), "utf8"),
    );
    expect(metadata.files.map(({ url }) => url)).toEqual([zipName]);
    expect(metadata.path).toBeUndefined();
    expect(metadata.sha512).toBeUndefined();
    expect(fs.existsSync(path.join(directory, `${dmgName}.blockmap`))).toBe(
      false,
    );
    expect(validateUpdateMetadata(directory, version, arch)).toHaveLength(3);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
