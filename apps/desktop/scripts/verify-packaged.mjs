import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import electron from "electron";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const archives = readdirSync("release").flatMap((directory) => {
  const archive = resolve(
    "release",
    directory,
    process.platform === "darwin"
      ? "Copper.app/Contents/Resources/app.asar"
      : "resources/app.asar",
  );
  return existsSync(archive) ? [archive] : [];
});
assert.equal(archives.length, 1, "Expected one native packaged application");
const source = `
  const assert = require('node:assert/strict');
  const root = ${JSON.stringify(archives[0])};
  assert.equal(require(root + '/package.json').version, ${JSON.stringify(version)});
  const Database = require(root + '/node_modules/better-sqlite3');
  const db = new Database(':memory:');
  assert.equal(db.prepare('SELECT 42 AS answer').get().answer, 42);
  db.close();
  console.log('Packaged version and native SQLite verified');
`;
execFileSync(electron, ["-e", source], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  stdio: "inherit",
});
