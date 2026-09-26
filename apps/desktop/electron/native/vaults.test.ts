import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalizeDir } from "./path";
import { VaultManager, vaultIdFor } from "./vaults";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("VaultManager", () => {
  it("open vault uses canonical identity without writing into the vault", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-vault-"));
    temps.push(root);
    const vault = path.join(root, "My Vault");
    fs.mkdirSync(vault);
    const manager = new VaultManager(path.join(root, "config"));
    expect(() => manager.openVault(vault)).toThrow();
    manager.grantSelection(vault);
    const info = manager.openVault(vault);
    expect(info.name).toBe("My Vault");
    expect(info.id).toBe(vaultIdFor(canonicalizeDir(vault)));
    expect(fs.existsSync(path.join(vault, ".copper"))).toBe(false);
    expect(manager.listRecent()).toHaveLength(1);
  });
});

it("reopens a valid recent vault but rejects a root replaced by a link", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-vault-grant-"));
  temps.push(root);
  const original = path.join(root, "original");
  const outside = path.join(root, "outside");
  fs.mkdirSync(original);
  fs.mkdirSync(outside);
  const manager = new VaultManager(path.join(root, "config"));
  manager.grantSelection(original);
  const vault = manager.openVault(original);
  manager.close(vault.id);
  expect(manager.openVault(original).id).toBe(vault.id);
  manager.close(vault.id);
  fs.rmdirSync(original);
  fs.symlinkSync(outside, original);
  expect(() => manager.openVault(original)).toThrow();
  expect(manager.listRecent()).toHaveLength(0);
});
