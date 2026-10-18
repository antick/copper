import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_IDENTITIES } from "../electron/app-identity.mjs";
import {
  downscale,
  encodeIcns,
  ICNS_REPRESENTATIONS,
} from "./generate-app-icon.mjs";
import { decodePng, encodePng } from "./png-rgba.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const identity = APP_IDENTITIES.development;
const iconsDir = path.join(root, identity.icon.directory);
const BADGE = {
  x: 612,
  y: 790,
  width: 350,
  height: 145,
  radius: 48,
  border: 7,
  background: [55, 166, 255],
  foreground: [19, 31, 48],
  textScale: 12,
  glyphs: {
    D: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  },
};

function roundedRect(rgba, size, bounds, color) {
  const { x, y, width, height, radius } = bounds;
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      const cx = Math.max(x + radius, Math.min(px, x + width - radius - 1));
      const cy = Math.max(y + radius, Math.min(py, y + height - radius - 1));
      if ((px - cx) ** 2 + (py - cy) ** 2 > radius ** 2) continue;
      const offset = (py * size + px) * 4;
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = 255;
    }
  }
}

function drawGlyph(rgba, size, x, y, glyph, scale, color) {
  glyph.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column] !== "1") continue;
      for (
        let py = y + rowIndex * scale;
        py < y + (rowIndex + 1) * scale;
        py += 1
      ) {
        for (
          let px = x + column * scale;
          px < x + (column + 1) * scale;
          px += 1
        ) {
          const offset = (py * size + px) * 4;
          rgba[offset] = color[0];
          rgba[offset + 1] = color[1];
          rgba[offset + 2] = color[2];
          rgba[offset + 3] = 255;
        }
      }
    }
  });
}

export function generateDevIcon() {
  fs.mkdirSync(iconsDir, { recursive: true });
  const source = decodePng(
    fs.readFileSync(path.join(root, identity.icon.source)),
  );
  if (source.width !== 1024 || source.height !== 1024) {
    throw new Error("Copper Dev icon source must be 1024px square");
  }
  const rgba = Buffer.from(source.data);
  roundedRect(rgba, source.width, BADGE, [255, 255, 255]);
  roundedRect(
    rgba,
    source.width,
    {
      ...BADGE,
      x: BADGE.x + BADGE.border,
      y: BADGE.y + BADGE.border,
      width: BADGE.width - BADGE.border * 2,
      height: BADGE.height - BADGE.border * 2,
      radius: BADGE.radius - BADGE.border,
    },
    BADGE.background,
  );

  const glyphWidth = 5 * BADGE.textScale;
  const glyphGap = BADGE.textScale;
  const textWidth = glyphWidth * 3 + glyphGap * 2;
  const textX = BADGE.x + Math.round((BADGE.width - textWidth) / 2);
  const textY = BADGE.y + Math.round((BADGE.height - 7 * BADGE.textScale) / 2);
  ["D", "E", "V"].forEach((letter, index) => {
    drawGlyph(
      rgba,
      source.width,
      textX + index * (glyphWidth + glyphGap),
      textY,
      BADGE.glyphs[letter],
      BADGE.textScale,
      BADGE.foreground,
    );
  });

  const pngPath = path.join(iconsDir, identity.icon.dockSource);
  fs.writeFileSync(pngPath, encodePng(source.width, source.height, rgba));
  fs.writeFileSync(
    path.join(iconsDir, identity.icon.icnsSource),
    encodeIcns(
      ICNS_REPRESENTATIONS.map(({ size, type }) => ({
        size,
        type,
        rgba: downscale(rgba, source.width, size),
      })),
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateDevIcon();
}
