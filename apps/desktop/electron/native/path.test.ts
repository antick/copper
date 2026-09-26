import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalizeDir, normalizeRelative, resolveInVault } from "./path";

const temps: string[] = [];

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-path-"));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("normalizeRelative", () => {
  it("rejects absolute and parent escapes", () => {
    expect(() => normalizeRelative("/etc/passwd")).toThrowError(
      /Absolute paths/,
    );
    expect(() => normalizeRelative("../secret.md")).toThrowError(/outside/);
    expect(normalizeRelative("notes/../Inbox/a.md")).toBe("Inbox/a.md");
  });
});

describe("resolveInVault", () => {
  it("rejects missing children below an escaping link for both path forms", () => {
    const vault = tmpDir();
    const outside = tmpDir();
    fs.symlinkSync(outside, path.join(vault, "escape"));
    for (const requested of [
      "escape/new.md",
      path.join(vault, "escape/new.md"),
    ]) {
      expect(() => resolveInVault(vault, requested)).toThrow(/outside/);
    }
    expect(resolveInVault(vault, path.join(vault, "new.md"))).toBe(
      path.join(fs.realpathSync(vault), "new.md"),
    );
  });
  it("rejects parent and absolute paths outside the vault", () => {
    const root = tmpDir();
    const vault = path.join(root, "vault");
    fs.mkdirSync(vault);
    fs.writeFileSync(path.join(root, "secret.md"), "nope");
    const canonical = canonicalizeDir(vault);
    expect(() => resolveInVault(canonical, "../secret.md")).toThrowError(
      /path_escape|outside/,
    );
    expect(() =>
      resolveInVault(canonical, path.join(root, "secret.md")),
    ).toThrowError(/outside/);
  });

  it("allows nested relative paths", () => {
    const vault = path.join(tmpDir(), "vault");
    fs.mkdirSync(path.join(vault, "notes"), { recursive: true });
    fs.writeFileSync(path.join(vault, "notes/hello.md"), "hi");
    const canonical = canonicalizeDir(vault);
    const resolved = resolveInVault(canonical, "notes/hello.md");
    expect(resolved.endsWith("hello.md")).toBe(true);
    expect(resolved.startsWith(canonical)).toBe(true);
  });
});
