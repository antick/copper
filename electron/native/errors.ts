export class CopperError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CopperError";
    this.code = code;
  }

  static pathEscape(message: string): CopperError {
    return new CopperError("path_escape", message);
  }

  static notFound(message: string): CopperError {
    return new CopperError("not_found", message);
  }

  static invalid(message: string): CopperError {
    return new CopperError("invalid", message);
  }

  static io(message: string): CopperError {
    return new CopperError("io", message);
  }

  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

export function toCopperError(error: unknown): CopperError {
  if (error instanceof CopperError) {
    return error;
  }
  if (error instanceof Error) {
    return CopperError.io(error.message);
  }
  return CopperError.io(String(error));
}
