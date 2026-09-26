import fs from "node:fs";
import path from "node:path";
import { CopperError } from "../errors";

function identity(root: string): string | null {
  const canonical = fs.realpathSync(root);
  const entry = path.join(canonical, ".git");
  if (!fs.existsSync(entry)) return null;
  let metadata = entry;
  if (fs.statSync(entry).isFile()) {
    const match = /^gitdir: (.+)\s*$/u.exec(fs.readFileSync(entry, "utf8"));
    if (!match) throw CopperError.invalid("Invalid Git metadata");
    metadata = path.resolve(canonical, match[1].trim());
  }
  metadata = fs.realpathSync(metadata);
  const stat = fs.statSync(metadata);
  const commonFile = path.join(metadata, "commondir");
  const common = fs.existsSync(commonFile)
    ? fs.realpathSync(
        path.resolve(metadata, fs.readFileSync(commonFile, "utf8").trim()),
      )
    : metadata;
  const config = path.join(common, "config");
  const version = fs.existsSync(config) ? fs.statSync(config) : null;
  return JSON.stringify([
    canonical,
    metadata,
    common,
    stat.dev,
    stat.ino,
    version && [
      version.dev,
      version.ino,
      version.mtimeMs,
      version.ctimeMs,
      version.size,
    ],
  ]);
}

export class GitTrust {
  private readonly grants = new Map<string, string>();

  state(root: string): "not_git" | "untrusted" | "trusted" {
    const current = identity(root);
    if (!current) return "not_git";
    return this.grants.get(fs.realpathSync(root)) === current
      ? "trusted"
      : "untrusted";
  }

  async request(
    root: string,
    confirm: () => Promise<boolean>,
  ): Promise<boolean> {
    const before = identity(root);
    if (!before || !(await confirm()) || before !== identity(root))
      return false;
    this.grants.set(fs.realpathSync(root), before);
    return true;
  }

  revoke(root: string): void {
    this.grants.delete(fs.realpathSync(root));
  }

  run<T>(root: string, operation: () => T): T {
    if (this.state(root) !== "trusted")
      throw CopperError.invalid("Enable Git for this vault first");
    return operation();
  }
}
