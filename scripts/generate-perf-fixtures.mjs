import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMarkdown, SIZES } from "./generate-markdown.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(dirname, "../tests/fixtures/performance");

await mkdir(outDir, { recursive: true });

for (const [name, size] of Object.entries(SIZES)) {
  const file = path.join(outDir, name);
  const body = generateMarkdown(size);
  await writeFile(file, body);
  console.log(`wrote ${name} (${body.length} bytes)`);
}
