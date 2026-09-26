import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng } from "./png-rgba.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS_DIR = path.join(root, "resources/icons");
const PUBLIC_ICON = path.join(root, "public/icon.png");
const MASTER_SIZE = 1024;
const FAVICON_SIZE = 256;
const SOURCE_ICON = path.join(ICONS_DIR, "copper-icon-source.png");
const ICO_SIZES = [16, 32, 48, 256];
const PNG_FILES = [
  { file: "icon.png", size: MASTER_SIZE },
  { file: "32x32.png", size: 32 },
  { file: "64x64.png", size: 64 },
  { file: "128x128.png", size: 128 },
  { file: "128x128@2x.png", size: 256 },
  { file: "Square30x30Logo.png", size: 30 },
  { file: "Square44x44Logo.png", size: 44 },
  { file: "Square71x71Logo.png", size: 71 },
  { file: "Square89x89Logo.png", size: 89 },
  { file: "Square107x107Logo.png", size: 107 },
  { file: "Square142x142Logo.png", size: 142 },
  { file: "Square150x150Logo.png", size: 150 },
  { file: "Square284x284Logo.png", size: 284 },
  { file: "Square310x310Logo.png", size: 310 },
  { file: "StoreLogo.png", size: 50 },
];
const ICNS_REPRESENTATIONS = [
  { size: 16, type: "icp4" },
  { size: 32, type: "icp5" },
  { size: 64, type: "icp6" },
  { size: 128, type: "ic07" },
  { size: 256, type: "ic08" },
  { size: 512, type: "ic09" },
  { size: 1024, type: "ic10" },
  { size: 32, type: "ic11" },
  { size: 64, type: "ic12" },
  { size: 512, type: "ic13" },
  { size: 1024, type: "ic14" },
];

function downscale(source, sourceSize, targetSize) {
  if (targetSize === sourceSize) {
    return source;
  }
  const rgba = Buffer.alloc(targetSize * targetSize * 4);
  const factor = sourceSize / targetSize;
  for (let y = 0; y < targetSize; y += 1) {
    const y0 = Math.floor(y * factor);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * factor));
    for (let x = 0; x < targetSize; x += 1) {
      const x0 = Math.floor(x * factor);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * factor));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let yy = y0; yy < y1; yy += 1) {
        for (let xx = x0; xx < x1; xx += 1) {
          const index = (yy * sourceSize + xx) * 4;
          const alpha = source[index + 3];
          r += source[index] * alpha;
          g += source[index + 1] * alpha;
          b += source[index + 2] * alpha;
          a += alpha;
          count += 1;
        }
      }
      const dest = (y * targetSize + x) * 4;
      if (a === 0) {
        continue;
      }
      rgba[dest] = Math.round(r / a);
      rgba[dest + 1] = Math.round(g / a);
      rgba[dest + 2] = Math.round(b / a);
      rgba[dest + 3] = Math.round(a / count);
    }
  }
  return rgba;
}

function writePng(filePath, size, master, masterSize) {
  const rgba = downscale(master, masterSize, size);
  fs.writeFileSync(filePath, encodePng(size, size, rgba));
  return rgba;
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  const blobs = [];
  let offset = 6 + 16 * images.length;
  for (const image of images) {
    const png = encodePng(image.size, image.size, image.rgba);
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    blobs.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...blobs]);
}

function encodeIcns(images) {
  const entries = images.map(({ size, type, rgba }) => {
    const png = encodePng(size, size, rgba);
    const entry = Buffer.alloc(8 + png.length);
    entry.write(type, 0, 4, "ascii");
    entry.writeUInt32BE(entry.length, 4);
    png.copy(entry, 8);
    return entry;
  });
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(
    8 + entries.reduce((sum, item) => sum + item.length, 0),
    4,
  );
  return Buffer.concat([header, ...entries]);
}

export function generateAppIcon() {
  const source = decodePng(fs.readFileSync(SOURCE_ICON));
  if (source.width !== source.height || source.width < MASTER_SIZE) {
    throw new Error("Icon source must be square and at least 1024px");
  }
  const master = downscale(source.data, source.width, MASTER_SIZE);
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  const cache = new Map([[MASTER_SIZE, master]]);
  function rgbaFor(size) {
    if (!cache.has(size)) {
      cache.set(size, downscale(master, MASTER_SIZE, size));
    }
    return cache.get(size);
  }
  for (const output of PNG_FILES) {
    writePng(
      path.join(ICONS_DIR, output.file),
      output.size,
      master,
      MASTER_SIZE,
    );
  }
  writePng(PUBLIC_ICON, FAVICON_SIZE, master, MASTER_SIZE);
  fs.writeFileSync(
    path.join(ICONS_DIR, "icon.ico"),
    encodeIco(ICO_SIZES.map((size) => ({ size, rgba: rgbaFor(size) }))),
  );
  fs.writeFileSync(
    path.join(ICONS_DIR, "copper.icns"),
    encodeIcns(
      ICNS_REPRESENTATIONS.map(({ size, type }) => ({
        size,
        type,
        rgba: rgbaFor(size),
      })),
    ),
  );
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  generateAppIcon();
}
