import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { createFile, readFile, saveFile } from "./service";

it("pairs the returned document with the hash of the same bytes during an external edit", () => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "copper-revision-")),
  );
  const absolute = path.join(root, "Note.md");
  createFile(root, "Note.md", "Original");
  const original = fs.readFileSync;
  let edited = false;
  const spy = vi
    .spyOn(fs, "readFileSync")
    .mockImplementation((...args: Parameters<typeof fs.readFileSync>) => {
      const bytes = Reflect.apply(original, fs, args);
      if (String(args[0]) === absolute && !edited) {
        edited = true;
        fs.writeFileSync(absolute, "External change");
      }
      return bytes;
    });
  try {
    const [contents, revision] = readFile(root, "Note.md");
    expect(edited).toBe(true);
    expect(revision.hash).toBe(
      crypto.createHash("sha256").update(contents).digest("hex"),
    );
    expect(contents).toBe("Original");
    expect(() => saveFile(root, "Note.md", "My draft", revision.hash)).toThrow(
      /changed on disk/i,
    );
    expect(original(absolute, "utf8")).toBe("External change");
  } finally {
    spy.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it("checks the disk hash after syncing the temporary file, immediately before replacement", () => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "copper-replace-")),
  );
  const absolute = path.join(root, "Note.md");
  createFile(root, "Note.md", "Original");
  const [, revision] = readFile(root, "Note.md");
  const original = fs.fsyncSync;
  const spy = vi.spyOn(fs, "fsyncSync").mockImplementation((handle) => {
    original(handle);
    fs.writeFileSync(absolute, "External edit while syncing");
  });
  try {
    expect(() => saveFile(root, "Note.md", "My draft", revision.hash)).toThrow(
      /changed on disk/i,
    );
    expect(fs.readFileSync(absolute, "utf8")).toBe(
      "External edit while syncing",
    );
    expect(fs.readdirSync(root)).toEqual(["Note.md"]);
  } finally {
    spy.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
