export const EDITOR_FONTS = [
  {
    id: "inter",
    label: "Inter",
    family: '"Inter Variable", Inter, sans-serif',
  },
  {
    id: "system",
    label: "System sans",
    family: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  { id: "lora", label: "Lora", family: '"Lora Variable", Georgia, serif' },
  {
    id: "georgia",
    label: "Georgia",
    family: 'Georgia, "Times New Roman", serif',
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    family: '"JetBrains Mono Variable", ui-monospace, monospace',
  },
  {
    id: "system-mono",
    label: "System mono",
    family: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  },
] as const;

export type EditorFontId = (typeof EDITOR_FONTS)[number]["id"];
export interface EditorTypography {
  fontFamily: EditorFontId;
  fontSize: number;
  lineHeight: number;
}

export const DEFAULT_EDITOR_TYPOGRAPHY: EditorTypography = {
  fontFamily: "inter",
  fontSize: 14,
  lineHeight: 1.55,
};
export const EDITOR_FONT_SIZE = { min: 11, max: 32, step: 1 };
export const EDITOR_LINE_HEIGHT = { min: 1.2, max: 2.4, step: 0.05 };

export function editorFont(value: unknown) {
  return EDITOR_FONTS.find((font) => font.id === value) ?? EDITOR_FONTS[0];
}

export function isTypographyNumber(
  value: number,
  bounds: { min: number; max: number },
) {
  return Number.isFinite(value) && value >= bounds.min && value <= bounds.max;
}

export function normalizeEditorTypography(
  value: Partial<EditorTypography>,
): EditorTypography {
  return {
    fontFamily: editorFont(value.fontFamily).id,
    fontSize: isTypographyNumber(value.fontSize ?? Number.NaN, EDITOR_FONT_SIZE)
      ? (value.fontSize as number)
      : DEFAULT_EDITOR_TYPOGRAPHY.fontSize,
    lineHeight: isTypographyNumber(
      value.lineHeight ?? Number.NaN,
      EDITOR_LINE_HEIGHT,
    )
      ? (value.lineHeight as number)
      : DEFAULT_EDITOR_TYPOGRAPHY.lineHeight,
  };
}
