import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_SUPPORTED_FILE_SIZE } from "../constants";
import {
  classifyFile,
  classifyKnownName,
  validateImageSignature,
} from "./classification";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("classification", () => {
  it("classifies every supported extension group case-insensitively", () => {
    expect(classifyKnownName("note.MD")?.kind).toBe("markdown");
    expect(classifyKnownName("component.mdx")?.kind).toBe("code");
    expect(classifyKnownName("table.csv")?.kind).toBe("text");
    expect(classifyKnownName("config.JSONC")?.kind).toBe("data");
    expect(classifyKnownName("app.TSX")?.kind).toBe("code");
    expect(classifyKnownName("photo.JPEG")?.kind).toBe("image");
    expect(classifyKnownName("manual.pdf")).toBeUndefined();
    expect(classifyKnownName(".hidden.md")).toBeUndefined();
  });

  it("detects only safe bounded extensionless text", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-class-"));
    temps.push(dir);
    const safe = path.join(dir, "README");
    fs.writeFileSync(safe, "hello ✓");
    expect(classifyFile(safe)?.typeLabel).toBe("TXT");

    const nul = path.join(dir, "NULFILE");
    fs.writeFileSync(nul, Buffer.from("hello\0world"));
    expect(classifyFile(nul)).toBeUndefined();

    const invalid = path.join(dir, "INVALID");
    fs.writeFileSync(invalid, Buffer.from([0xff, 0xfe]));
    expect(classifyFile(invalid)).toBeUndefined();

    const oversized = path.join(dir, "LARGE");
    fs.writeFileSync(oversized, "");
    fs.truncateSync(oversized, MAX_SUPPORTED_FILE_SIZE + 1);
    expect(classifyFile(oversized)).toBeUndefined();
  });

  it("validates image magic", () => {
    const png = classifyKnownName("photo.png");
    expect(png).toBeTruthy();
    if (!png) return;
    expect(() =>
      validateImageSignature(
        png,
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x72, 0x65, 0x73,
          0x74,
        ]),
      ),
    ).not.toThrow();
    expect(() =>
      validateImageSignature(png, Buffer.from("not a png")),
    ).toThrow();
    const webp = classifyKnownName("photo.webp");
    expect(webp).toBeTruthy();
    if (!webp) return;
    expect(() =>
      validateImageSignature(webp, Buffer.from("RIFF1234WEBPrest")),
    ).not.toThrow();
  });
});
