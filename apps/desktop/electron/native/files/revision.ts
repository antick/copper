import crypto from "node:crypto";
import fs from "node:fs";

export interface DiskRevision {
  path: string;
  size: number;
  mtimeNs: number;
  hash: string;
}

export function revisionFromPath(
  absolute: string,
  relative: string,
  bytes = fs.readFileSync(absolute),
): DiskRevision {
  const meta = fs.statSync(absolute);
  return {
    path: relative,
    size: bytes.length,
    mtimeNs: Math.trunc(meta.mtimeMs * 1_000_000),
    hash: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}
