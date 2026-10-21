export const DEFAULT_ATTACHMENT_FOLDER = "attachments";

export type AttachmentFolderValidation =
  | { valid: true; folder: string }
  | { valid: false; message: string };

const EMPTY_FOLDER_MESSAGE = "Enter a folder path inside the active Vault.";
const ABSOLUTE_FOLDER_MESSAGE =
  "Use a relative folder path inside the active Vault.";
const TRAVERSAL_FOLDER_MESSAGE =
  "Remove '..' path segments so the folder stays inside the Vault.";
const INVALID_NAME_MESSAGE =
  "Folder names cannot contain control characters or Windows-reserved characters.";
const INVALID_PORTABLE_NAME_MESSAGE =
  "Folder names cannot end with a space or period on all supported systems.";

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const WINDOWS_INVALID_CHARACTERS = /[<>:"|?*]/;

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });
}

export function validateAttachmentFolder(
  input: unknown,
): AttachmentFolderValidation {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { valid: false, message: EMPTY_FOLDER_MESSAGE };
  }

  const separated = input.replaceAll("\\", "/");
  if (separated.startsWith("/") || /^[a-zA-Z]:/.test(separated)) {
    return { valid: false, message: ABSOLUTE_FOLDER_MESSAGE };
  }

  const segments: string[] = [];
  for (const segment of separated.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      return { valid: false, message: TRAVERSAL_FOLDER_MESSAGE };
    }
    if (
      containsControlCharacter(segment) ||
      WINDOWS_INVALID_CHARACTERS.test(segment) ||
      segment.trim().length === 0
    ) {
      return { valid: false, message: INVALID_NAME_MESSAGE };
    }
    if (/[ .]$/.test(segment) || WINDOWS_RESERVED_NAME.test(segment)) {
      return { valid: false, message: INVALID_PORTABLE_NAME_MESSAGE };
    }
    segments.push(segment);
  }

  if (segments.length === 0) {
    return { valid: false, message: EMPTY_FOLDER_MESSAGE };
  }

  return { valid: true, folder: segments.join("/") };
}

export function normalizeAttachmentFolder(input: unknown): string {
  const result = validateAttachmentFolder(input);
  return result.valid ? result.folder : DEFAULT_ATTACHMENT_FOLDER;
}
