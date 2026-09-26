import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  assertReleaseProtections,
  requireReleaseCredentials,
  validateUpdateMetadata,
} from "../../scripts/release-policy.mjs";

it("rejects unrelated or incomplete tag protection and broad deployment policies", () => {
  const environment = {
    protection_rules: [{ type: "required_reviewers", reviewers: [{}] }],
    deployment_branch_policy: { custom_branch_policies: true },
  };
  const policies = { branch_policies: [{ type: "tag", name: "v*.*.*" }] };
  const rule = {
    target: "tag",
    enforcement: "active",
    conditions: { ref_name: { include: ["refs/tags/v*.*.*"], exclude: [] } },
    rules: ["creation", "update", "deletion"].map((type) => ({ type })),
  };
  expect(() =>
    assertReleaseProtections(environment, policies, [rule], "refs/tags/v1.0.0"),
  ).not.toThrow();
  expect(() =>
    assertReleaseProtections(
      environment,
      policies,
      [{ ...rule, rules: [] }],
      "refs/tags/v1.0.0",
    ),
  ).toThrow(/protection/);
  expect(() =>
    assertReleaseProtections(environment, policies, [rule], "refs/tags/other"),
  ).toThrow(/tag/);
  expect(() =>
    assertReleaseProtections(
      environment,
      {
        branch_policies: [
          ...policies.branch_policies,
          { type: "branch", name: "*" },
        ],
      },
      [rule],
      "refs/tags/v1.0.0",
    ),
  ).toThrow(/environment/);
});

it("blocks missing credentials and explicitly disabled signing", () => {
  expect(() => requireReleaseCredentials({})).toThrow(/Release blocked/);
  expect(() =>
    requireReleaseCredentials({
      CSC_LINK: "x",
      CSC_KEY_PASSWORD: "x",
      APPLE_ID: "x",
      APPLE_APP_SPECIFIC_PASSWORD: "x",
      APPLE_TEAM_ID: "x",
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
    }),
  ).toThrow(/disabled/);
});
it("rejects a tampered update archive or unsafe artifact path", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-release-test-"),
  );
  try {
    const bytes = Buffer.from("fixture");
    const sha512 = createHash("sha512").update(bytes).digest("base64");
    fs.writeFileSync(path.join(directory, "Copper.zip"), bytes);
    fs.writeFileSync(
      path.join(directory, "latest-mac.yml"),
      JSON.stringify({
        version: "1.0.0",
        files: [{ url: "Copper.zip", size: bytes.length, sha512 }],
      }),
    );
    expect(validateUpdateMetadata(directory, "1.0.0")).toContain("Copper.zip");
    fs.writeFileSync(path.join(directory, "Copper.zip"), "changed");
    expect(() => validateUpdateMetadata(directory, "1.0.0")).toThrow(
      /checksum/,
    );
    fs.writeFileSync(
      path.join(directory, "latest-mac.yml"),
      JSON.stringify({ version: "1.0.0", files: [{ url: "../outside.zip" }] }),
    );
    expect(() => validateUpdateMetadata(directory, "1.0.0")).toThrow(/Unsafe/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
