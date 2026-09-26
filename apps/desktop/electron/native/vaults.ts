import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { RECENT_VAULT_LIMIT } from "./constants";
import { CopperError } from "./errors";
import { canonicalizeDir } from "./path";

export interface VaultInfo {
  id: string;
  name: string;
  path: string;
}

interface RecentVaultsFile {
  vaults: VaultInfo[];
}

export function vaultIdFor(canonical: string): string {
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export class VaultManager {
  private readonly grants = new Set<string>();
  private readonly open = new Map<string, VaultInfo>();

  constructor(private readonly configDir: string) {}

  grantSelection(dir: string): string {
    const canonical = canonicalizeDir(dir);
    this.grants.add(canonical);
    return canonical;
  }

  openVault(dir: string): VaultInfo {
    const canonical = canonicalizeDir(dir);
    const remembered = this.listRecent().some(
      (item) => item.path === canonical,
    );
    if (!this.grants.has(canonical) && !remembered) {
      throw CopperError.invalid("Select this vault in the folder picker first");
    }
    const info: VaultInfo = {
      id: vaultIdFor(canonical),
      name: path.basename(canonical) || "Vault",
      path: canonical,
    };
    this.open.set(info.id, info);
    this.pushRecent(info);
    return info;
  }

  close(vaultId: string): void {
    const info = this.open.get(vaultId);
    if (info) this.grants.delete(info.path);
    this.open.delete(vaultId);
  }

  get(vaultId: string): VaultInfo {
    const info = this.open.get(vaultId);
    if (!info) {
      throw CopperError.notFound("Vault is not open");
    }
    return info;
  }

  listRecent(): VaultInfo[] {
    return this.readRecent().vaults.filter((item) => {
      try {
        return (
          typeof item?.path === "string" &&
          typeof item?.id === "string" &&
          canonicalizeDir(item.path) === item.path &&
          vaultIdFor(item.path) === item.id
        );
      } catch {
        return false;
      }
    });
  }

  private recentPath(): string {
    return path.join(this.configDir, "recent-vaults.json");
  }

  private readRecent(): RecentVaultsFile {
    const file = this.recentPath();
    if (!fs.existsSync(file)) {
      return { vaults: [] };
    }
    try {
      const parsed = JSON.parse(
        fs.readFileSync(file, "utf8"),
      ) as RecentVaultsFile;
      return { vaults: Array.isArray(parsed.vaults) ? parsed.vaults : [] };
    } catch {
      return { vaults: [] };
    }
  }

  private pushRecent(info: VaultInfo): void {
    fs.mkdirSync(this.configDir, { recursive: true });
    const recent = this.readRecent();
    recent.vaults = [
      info,
      ...recent.vaults.filter((item) => item.id !== info.id),
    ].slice(0, RECENT_VAULT_LIMIT);
    fs.writeFileSync(this.recentPath(), JSON.stringify(recent, null, 2));
  }
}
