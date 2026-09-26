import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { atomicWrite } from "./atomic-write";

const temps: string[] = [];

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-atomic-"));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("atomicWrite", () => {
  it("replaces a complete file and removes the temp sibling", () => {
    const dir = tmpDir();
    const file = path.join(dir, "note.md");
    fs.writeFileSync(file, "keep me");
    atomicWrite(file, "updated safely");
    expect(fs.readFileSync(file, "utf8")).toBe("updated safely");
    expect(fs.existsSync(path.join(dir, ".note.md.copper-tmp"))).toBe(false);
  });

  it("failed temp write leaves the original bytes", () => {
    const dir = tmpDir();
    const file = path.join(dir, "note.md");
    fs.writeFileSync(file, "original");
    const blocked = path.join(dir, "blocked");
    fs.writeFileSync(blocked, "not a directory");
    const nested = path.join(blocked, "nested.md");
    expect(() => atomicWrite(nested, "nope")).toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe("original");
  });
});

it("does not follow a preplanted temporary-file link", () => {
  const dir = tmpDir();
  const outside = path.join(dir, "outside.txt");
  fs.writeFileSync(outside, "preserved");
  fs.symlinkSync(outside, path.join(dir, ".note.md.copper-tmp"));
  atomicWrite(path.join(dir, "note.md"), "note");
  expect(fs.readFileSync(outside, "utf8")).toBe("preserved");
  expect(fs.readFileSync(path.join(dir, "note.md"), "utf8")).toBe("note");
});
