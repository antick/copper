import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  expectedInstallers,
  verifyInstallers,
} from "../../../../scripts/release-artifacts.mjs";

it("requires all platform installers before creating release checksums", () => {
  const directory = mkdtempSync(join(tmpdir(), "copper-installers-"));
  try {
    const names = expectedInstallers("0.1.0");
    expect(names).toHaveLength(9);
    expect(() => verifyInstallers(directory, "0.1.0")).toThrow();
    for (const name of names) writeFileSync(join(directory, name), "fixture");
    expect(
      verifyInstallers(directory, "0.1.0").trim().split("\n"),
    ).toHaveLength(9);
    writeFileSync(join(directory, names[0]), "");
    expect(() => verifyInstallers(directory, "0.1.0")).toThrow(
      /Empty installer/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
