import fs from "node:fs";
import path from "node:path";
import { MAX_SUPPORTED_FILE_SIZE } from "../constants";
import { CopperError } from "../errors";

export type FileKind = "markdown" | "text" | "code" | "data" | "image";

export interface FileClassification {
  kind: FileKind;
  typeLabel: string;
  mimeType?: string;
}

export function isHiddenName(name: string): boolean {
  return name.startsWith(".");
}

export function isTextKind(kind: FileKind): boolean {
  return kind !== "image";
}

const TEXT_EXT = new Set(["txt", "text", "log", "csv", "tsv"]);
const DATA_EXT = new Set([
  "json",
  "jsonc",
  "yaml",
  "yml",
  "toml",
  "xml",
  "ini",
  "cfg",
  "conf",
]);
const CODE_EXT = new Set([
  "mdx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "py",
  "rb",
  "rs",
  "go",
  "java",
  "kt",
  "kts",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "cs",
  "php",
  "sh",
  "bash",
  "zsh",
  "fish",
  "sql",
  "graphql",
  "gql",
  "vue",
  "svelte",
]);

export function classifyKnownName(
  name: string,
): FileClassification | undefined {
  if (isHiddenName(name)) {
    return undefined;
  }
  const ext = path.extname(name).slice(1).toLowerCase();
  if (!ext) {
    return undefined;
  }
  if (ext === "md" || ext === "markdown") {
    return { kind: "markdown", typeLabel: ext.toUpperCase() };
  }
  if (TEXT_EXT.has(ext)) {
    return { kind: "text", typeLabel: ext.toUpperCase() };
  }
  if (DATA_EXT.has(ext)) {
    return { kind: "data", typeLabel: ext.toUpperCase() };
  }
  if (CODE_EXT.has(ext)) {
    return { kind: "code", typeLabel: ext.toUpperCase() };
  }
  if (ext === "png") {
    return { kind: "image", typeLabel: "PNG", mimeType: "image/png" };
  }
  if (ext === "jpg" || ext === "jpeg") {
    return {
      kind: "image",
      typeLabel: ext.toUpperCase(),
      mimeType: "image/jpeg",
    };
  }
  if (ext === "gif") {
    return { kind: "image", typeLabel: "GIF", mimeType: "image/gif" };
  }
  if (ext === "webp") {
    return { kind: "image", typeLabel: "WEBP", mimeType: "image/webp" };
  }
  if (ext === "bmp") {
    return { kind: "image", typeLabel: "BMP", mimeType: "image/bmp" };
  }
  return undefined;
}

export function classifyFile(filePath: string): FileClassification | undefined {
  const metadata = fs.statSync(filePath);
  if (!metadata.isFile() || metadata.size > MAX_SUPPORTED_FILE_SIZE) {
    return undefined;
  }
  const name = path.basename(filePath);
  if (isHiddenName(name)) {
    return undefined;
  }
  const known = classifyKnownName(name);
  if (known) {
    return known;
  }
  if (path.extname(name)) {
    return undefined;
  }
  const bytes = fs.readFileSync(filePath);
  if (bytes.includes(0) || !isUtf8(bytes)) {
    return undefined;
  }
  return { kind: "text", typeLabel: "TXT" };
}

export function validateTextBytes(bytes: Buffer): string {
  if (bytes.includes(0)) {
    throw CopperError.invalid(
      "Text files containing NUL bytes are not supported",
    );
  }
  if (!isUtf8(bytes)) {
    throw CopperError.invalid("Only UTF-8 text files are supported");
  }
  return bytes.toString("utf8");
}

export function validateImageSignature(
  classification: FileClassification,
  bytes: Buffer,
): void {
  const valid =
    (classification.mimeType === "image/png" &&
      bytes
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )) ||
    (classification.mimeType === "image/jpeg" &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff) ||
    (classification.mimeType === "image/gif" &&
      (bytes.subarray(0, 6).equals(Buffer.from("GIF87a")) ||
        bytes.subarray(0, 6).equals(Buffer.from("GIF89a")))) ||
    (classification.mimeType === "image/webp" &&
      bytes.length >= 12 &&
      bytes.subarray(0, 4).equals(Buffer.from("RIFF")) &&
      bytes.subarray(8, 12).equals(Buffer.from("WEBP"))) ||
    (classification.mimeType === "image/bmp" &&
      bytes.subarray(0, 2).equals(Buffer.from("BM")));
  if (!valid) {
    throw CopperError.invalid(
      "Image contents do not match the supported file type",
    );
  }
}

function isUtf8(bytes: Buffer): boolean {
  try {
    const decoded = bytes.toString("utf8");
    return Buffer.from(decoded, "utf8").equals(bytes);
  } catch {
    return false;
  }
}
