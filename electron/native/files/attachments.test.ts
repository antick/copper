import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { importAttachment } from "./attachments";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

it("never follows a dangling attachment destination outside the vault", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-attachment-security-"),
  );
  roots.push(root);
  const vault = path.join(root, "vault");
  fs.mkdirSync(path.join(vault, "attachments"), { recursive: true });
  const source = path.join(root, "sample.txt");
  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(source, "safe attachment");
  fs.symlinkSync(outside, path.join(vault, "attachments/sample.txt"));
  try {
    importAttachment(vault, "attachments", source);
  } catch {
    /* rejecting the link is safe */
  }
  expect(fs.existsSync(outside)).toBe(false);
  expect(fs.readFileSync(source, "utf8")).toBe("safe attachment");
});

it("keeps existing attachment bytes and rejects an escaping directory", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "copper-attachment-collision-"),
  );
  roots.push(root);
  const vault = path.join(root, "vault");
  fs.mkdirSync(vault);
  const source = path.join(root, "sample.txt");
  fs.writeFileSync(source, "incoming");
  expect(importAttachment(vault, "attachments", source)).toBe(
    "attachments/sample.txt",
  );
  fs.writeFileSync(source, "second");
  expect(importAttachment(vault, "attachments", source)).toBe(
    "attachments/sample-2.txt",
  );
  expect(
    fs.readFileSync(path.join(vault, "attachments/sample.txt"), "utf8"),
  ).toBe("incoming");
  const outside = path.join(root, "outside");
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(vault, "escape"));
  expect(() => importAttachment(vault, "escape", source)).toThrow();
  expect(fs.readdirSync(outside)).toEqual([]);
});
