import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { makeTempDir, writeFile } from "./git-fixture";
import { nextSiblingRelative, sidecarSuffix, splitBaseName } from "./sibling";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("keep-both sibling names", () => {
  it("splits stem and extension", () => {
    expect(splitBaseName("Daily.md")).toEqual({ stem: "Daily", ext: ".md" });
    expect(splitBaseName("photo.png")).toEqual({ stem: "photo", ext: ".png" });
    expect(splitBaseName("README")).toEqual({ stem: "README", ext: "" });
  });

  it("uses GitHub or remote suffixes", () => {
    expect(sidecarSuffix("github")).toBe("from GitHub");
    expect(sidecarSuffix("remote")).toBe("from remote");
  });

  it("allocates Daily (from GitHub).md then numbered siblings", () => {
    const root = makeTempDir("copper-git-sib-");
    temps.push(root);
    writeFile(root, "Daily.md", "mine\n");
    expect(nextSiblingRelative(root, "Daily.md", "from GitHub")).toBe(
      "Daily (from GitHub).md",
    );
    writeFile(root, "Daily (from GitHub).md", "theirs\n");
    expect(nextSiblingRelative(root, "Daily.md", "from GitHub")).toBe(
      "Daily (from GitHub) 2.md",
    );
  });

  it("keeps siblings in the same directory", () => {
    const root = makeTempDir("copper-git-sibdir-");
    temps.push(root);
    writeFile(root, "attachments/photo.png", "x");
    expect(
      nextSiblingRelative(root, "attachments/photo.png", "from GitHub"),
    ).toBe("attachments/photo (from GitHub).png");
    expect(
      fs.existsSync(path.join(root, "attachments", "photo (from GitHub).png")),
    ).toBe(false);
  });
});
