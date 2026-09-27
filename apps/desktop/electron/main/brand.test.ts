import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodePng, pixelAt } from "./png-rgba";

const root = process.cwd();
function readIcon(relativePath: string) {
  return decodePng(fs.readFileSync(path.join(root, relativePath)));
}

function readIcnsPng(type: string) {
  const source = fs.readFileSync(
    path.join(root, "resources/icons/copper.icns"),
  );
  expect(source.subarray(0, 4).toString("ascii")).toBe("icns");
  expect(source.readUInt32BE(4)).toBe(source.length);
  for (let offset = 8; offset < source.length; ) {
    const length = source.readUInt32BE(offset + 4);
    if (source.subarray(offset, offset + 4).toString("ascii") === type) {
      return decodePng(source.subarray(offset + 8, offset + length));
    }
    offset += length;
  }
  throw new Error(`Missing ${type} in Copper.icns`);
}

describe("brand icon files", () => {
  it("keeps only the app-specific Copper icns source", () => {
    const icons = path.resolve(process.cwd(), "resources/icons");
    expect(fs.existsSync(path.join(icons, "icon.png"))).toBe(true);
    expect(fs.existsSync(path.join(icons, "copper.icns"))).toBe(true);
    expect(fs.existsSync(path.join(icons, "icon.icns"))).toBe(false);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as {
      build: {
        buildVersion: string;
        extraResources: Array<{ from: string; to: string }>;
        mac: { icon: string; extendInfo: { CFBundleIconFile: string } };
      };
    };
    expect(pkg.build.buildVersion).toBe("0.1.0");
    expect(pkg.build.mac.icon).toBe("resources/icons/copper.icns");
    expect(pkg.build.mac.extendInfo.CFBundleIconFile).toBe("Copper.icns");
    expect(pkg.build.extraResources).toContainEqual({
      from: "resources/icons/copper.icns",
      to: "Copper.icns",
    });
    expect(pkg.build.extraResources).toContainEqual({
      from: "resources/icons/icon.png",
      to: "Copper.png",
    });
  });

  it("keeps the approved artwork as the unmodified master", () => {
    const bytes = fs.readFileSync(
      path.join(root, "resources/icons/copper-icon-source.png"),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "944904f97737e409a173c2152a6198850def110636781f31ca07002415b748e3",
    );
    const source = readIcon("resources/icons/copper-icon-source.png");
    expect(source.width).toBe(source.height);
    expect(source.width).toBeGreaterThanOrEqual(1024);
    // Golden source pixel also checks decoding the generated PNG's filters.
    expect(pixelAt(source, 313, 627)).toEqual({
      r: 227,
      g: 162,
      b: 111,
      a: 253,
    });
    expectCopperArtwork(source);
  });

  it("preserves the copper C, charcoal counter, and alpha in every PNG", () => {
    for (const file of fs.readdirSync(path.join(root, "resources/icons"))) {
      if (file.endsWith(".png"))
        expectCopperArtwork(readIcon(`resources/icons/${file}`));
    }
    const favicon = readIcon("public/icon.png");
    expect(favicon.width).toBe(256);
    expectCopperArtwork(favicon);
    expect(readIcon("resources/icons/icon.png").width).toBe(1024);
  });

  it("embeds the same artwork in standard and Retina macOS icons and Windows ICO", () => {
    for (const [type, size] of [
      ["ic10", 1024],
      ["ic11", 32],
    ] as const) {
      const icon = readIcnsPng(type);
      expect(icon.width).toBe(size);
      expectCopperArtwork(icon);
      const png = readIcon(
        `resources/icons/${size === 1024 ? "icon" : "32x32"}.png`,
      );
      expect(icon.data.equals(png.data)).toBe(true);
    }
    const ico = fs.readFileSync(path.join(root, "resources/icons/icon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(4);
    for (let i = 0; i < 4; i += 1) {
      const entry = 6 + i * 16;
      const size = ico[entry] || 256;
      const offset = ico.readUInt32LE(entry + 12);
      const length = ico.readUInt32LE(entry + 8);
      const icon = decodePng(ico.subarray(offset, offset + length));
      expect(icon.width).toBe(size);
      expectCopperArtwork(icon);
    }
  });
});

function expectCopperArtwork(png: ReturnType<typeof decodePng>) {
  expect(png.width).toBe(png.height);
  expect(pixelAt(png, 0, 0).a).toBe(0);
  const sample = (x: number, y: number) =>
    pixelAt(png, Math.floor(x * png.width), Math.floor(y * png.height));
  const copper = sample(0.25, 0.5);
  // Preserve the approved source's near-opaque alpha (252–254), not a forced 255.
  expect(copper.a).toBeGreaterThanOrEqual(250);
  expect(copper.r).toBeGreaterThan(150);
  expect(copper.r - copper.g).toBeGreaterThan(35);
  expect(copper.g - copper.b).toBeGreaterThan(15);
  for (const point of [
    [0.5, 0.5],
    [0.8, 0.5],
    [0.15, 0.5],
  ]) {
    const charcoal = sample(point[0], point[1]);
    expect(charcoal.a).toBeGreaterThanOrEqual(250);
    expect(Math.max(charcoal.r, charcoal.g, charcoal.b)).toBeLessThan(85);
  }
}
