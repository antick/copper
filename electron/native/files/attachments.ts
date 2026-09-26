import fs from "node:fs";
import path from "node:path";
import { CopperError } from "../errors";
import { normalizeRelative, resolveInVault, toPosix } from "../path";

export function importAttachment(
  root: string,
  attachmentFolder: string,
  source: string,
): string {
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw CopperError.invalid("Dropped path is not a file");
  }
  const folder = normalizeRelative(attachmentFolder);
  const destDir = resolveInVault(root, folder);
  fs.mkdirSync(destDir, { recursive: true });
  const parsed = path.parse(path.basename(source) || "attachment");
  const stem = parsed.name || "attachment";
  for (let n = 1; ; n += 1) {
    const name = `${stem}${n === 1 ? "" : `-${n}`}${parsed.ext}`;
    const relative = toPosix(path.join(folder, name));
    const destination = path.join(destDir, name);
    // Reserve the name during the copy: a dangling link is also a collision.
    try {
      if (fs.lstatSync(destination)) continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    resolveInVault(root, relative);
    try {
      fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
      return relative;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}
