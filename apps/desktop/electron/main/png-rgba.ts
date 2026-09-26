export { decodePng } from "../../scripts/png-rgba.mjs";

export function pixelAt(
  png: { width: number; data: Buffer },
  x: number,
  y: number,
) {
  const index = (y * png.width + x) * 4;
  return {
    r: png.data[index],
    g: png.data[index + 1],
    b: png.data[index + 2],
    a: png.data[index + 3],
  };
}
