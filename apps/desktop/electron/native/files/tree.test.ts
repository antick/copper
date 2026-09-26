import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanTree } from "./tree";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("scanTree", () => {
  it("scans supported files and skips hidden unsupported and root archive", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-tree-"));
    temps.push(root);
    fs.mkdirSync(path.join(root, "notes/daily"), { recursive: true });
    fs.mkdirSync(path.join(root, "notes/Archive"), { recursive: true });
    fs.mkdirSync(path.join(root, "Archive/nested"), { recursive: true });
    fs.mkdirSync(path.join(root, ".git"));
    fs.writeFileSync(path.join(root, "notes/daily/today.md"), "hi");
    fs.writeFileSync(path.join(root, "notes/app.ts"), "const ok = true;");
    fs.writeFileSync(path.join(root, "notes/README"), "plain");
    fs.writeFileSync(
      path.join(root, "notes/photo.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    fs.writeFileSync(path.join(root, "notes/manual.pdf"), "nope");
    fs.writeFileSync(path.join(root, "Archive/nested/old.md"), "old");
    fs.writeFileSync(path.join(root, "notes/Archive/visible.md"), "nested");
    fs.writeFileSync(path.join(root, ".hidden.md"), "nope");

    const children = scanTree(root).children ?? [];
    expect(children.every((node) => node.name !== "Archive")).toBe(true);
    expect(children.every((node) => node.name !== ".git")).toBe(true);
    const notes = children.find((node) => node.name === "notes");
    const nested = notes?.children ?? [];
    expect(nested.some((node) => node.name === "Archive")).toBe(true);
    expect(
      nested.some((node) => node.name === "app.ts" && node.fileKind === "code"),
    ).toBe(true);
    expect(
      nested.some((node) => node.name === "README" && node.typeLabel === "TXT"),
    ).toBe(true);
    expect(
      nested.some(
        (node) => node.name === "photo.png" && node.fileKind === "image",
      ),
    ).toBe(true);
    expect(nested.every((node) => node.name !== "manual.pdf")).toBe(true);
  });

  it("rejects unsafe extensionless files and orders folders first", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-tree2-"));
    temps.push(root);
    fs.mkdirSync(path.join(root, "Zed"));
    fs.writeFileSync(path.join(root, "alpha.md"), "");
    fs.writeFileSync(path.join(root, "BINARY"), Buffer.from("x\0y"));
    fs.writeFileSync(path.join(root, "INVALID"), Buffer.from([0xff]));
    const children = scanTree(root).children ?? [];
    expect(children[0]?.name).toBe("Zed");
    expect(children[1]?.name).toBe("alpha.md");
    expect(children).toHaveLength(2);
  });
});
