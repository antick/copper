import fs from "node:fs";
import path from "node:path";

const PRELOAD_NAMES = ["index.cjs", "index.js", "index.mjs"];

export function resolvePreloadScript(mainDir: string): string {
  const dir = path.join(mainDir, "../preload");
  for (const name of PRELOAD_NAMES) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Copper preload script was not found in ${dir} (tried ${PRELOAD_NAMES.join(", ")})`,
  );
}
