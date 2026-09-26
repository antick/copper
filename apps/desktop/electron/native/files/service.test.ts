import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  archiveFile,
  binaryMetadata,
  createFile,
  createFolder,
  readBinaryFile,
  readFile,
  restoreFile,
  saveFile,
  trashPath,
} from "./service";

const temps: string[] = [];

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-files-"));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("FileService", () => {
  it("reads and saves supported text but rejects binary and escape", () => {
    const root = tmpDir();
    createFolder(root, "src");
    createFile(root, "src/app.ts", "const x = 1;\n");
    const [body, revision] = readFile(root, "src/app.ts");
    expect(body).toBe("const x = 1;\n");
    expect(revision.size).toBeGreaterThan(0);
    saveFile(root, "src/app.ts", "const x = 2;\n");
    fs.writeFileSync(path.join(root, "src/bad.txt"), Buffer.from([0xff, 0xfe]));
    expect(() => readFile(root, "src/bad.txt")).toThrow();
    try {
      readFile(root, "../escape.ts");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("path_escape");
    }
  });

  it("validates bounded image reads", () => {
    const root = tmpDir();
    fs.writeFileSync(
      path.join(root, "photo.png"),
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x72, 0x65, 0x73, 0x74,
      ]),
    );
    const meta = binaryMetadata(root, "photo.png");
    expect(meta.mimeType).toBe("image/png");
    expect(readBinaryFile(root, "photo.png").length).toBe(meta.size);
    fs.writeFileSync(path.join(root, "fake.png"), "not an image");
    expect(() => readBinaryFile(root, "fake.png")).toThrow();
    expect(() => readBinaryFile(root, "../photo.png")).toThrow();
  });

  it("archives and restores without overwriting", () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, "Projects"));
    fs.writeFileSync(path.join(root, "Projects/plan.md"), "# Plan");
    const archived = archiveFile(root, "Projects/plan.md");
    expect(archived).toBe("Archive/Projects/plan.md");
    expect(fs.existsSync(path.join(root, archived))).toBe(true);
    expect(() => archiveFile(root, archived)).toThrow();
    expect(restoreFile(root, archived)).toBe("Projects/plan.md");
    fs.mkdirSync(path.join(root, "Archive/Projects"), { recursive: true });
    fs.writeFileSync(path.join(root, "Archive/Projects/plan.md"), "old");
    expect(() => archiveFile(root, "Projects/plan.md")).toThrow();
    expect(fs.readFileSync(path.join(root, "Projects/plan.md"), "utf8")).toBe(
      "# Plan",
    );
  });

  it("trash validation precedes backend and failures preserve files", async () => {
    const root = tmpDir();
    fs.writeFileSync(path.join(root, "note.md"), "hello");
    let called = false;
    await expect(
      trashPath(root, "note.md", async () => {
        called = true;
        throw Object.assign(new Error("Trash unavailable"), { code: "io" });
      }),
    ).rejects.toThrow();
    expect(called).toBe(true);
    expect(fs.existsSync(path.join(root, "note.md"))).toBe(true);

    let rootCalled = false;
    await expect(
      trashPath(root, "", async () => {
        rootCalled = true;
      }),
    ).rejects.toThrow();
    expect(rootCalled).toBe(false);
    await expect(
      trashPath(root, "../outside", async () => undefined),
    ).rejects.toThrow();
  });
});
