import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolvePreloadScript } from "./preload-path";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolvePreloadScript", () => {
  it("prefers a CommonJS preload over ESM", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-preload-"));
    temps.push(root);
    const mainDir = path.join(root, "main");
    const preloadDir = path.join(root, "preload");
    fs.mkdirSync(mainDir);
    fs.mkdirSync(preloadDir);
    fs.writeFileSync(path.join(preloadDir, "index.mjs"), "export {}");
    fs.writeFileSync(path.join(preloadDir, "index.cjs"), "module.exports = {}");
    expect(resolvePreloadScript(mainDir)).toBe(
      path.join(preloadDir, "index.cjs"),
    );
  });

  it("throws when no preload file exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-preload-miss-"));
    temps.push(root);
    const mainDir = path.join(root, "main");
    fs.mkdirSync(mainDir);
    fs.mkdirSync(path.join(root, "preload"));
    expect(() => resolvePreloadScript(mainDir)).toThrow(/preload script/);
  });
});
