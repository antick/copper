import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CopperError } from "./errors";

export function atomicWrite(filePath: string, contents: string): void {
  const parent = path.dirname(filePath);
  if (!parent || parent === ".") {
    throw CopperError.invalid("Cannot write a file without a parent directory");
  }
  fs.mkdirSync(parent, { recursive: true });
  const base = path.basename(filePath) || "note.md";
  const tempPath = path.join(parent, `.${base}.${randomUUID()}.copper-tmp`);
  let created = false;
  try {
    const handle = fs.openSync(tempPath, "wx", 0o600);
    created = true;
    try {
      fs.writeFileSync(handle, contents, "utf8");
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (created) fs.unlinkSync(tempPath);
    } catch {
      // temp may not exist
    }
    throw error instanceof CopperError ? error : CopperError.io(String(error));
  }
}
