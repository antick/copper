import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultSettings, normalizeSettings } from "@/lib/copper/settings";
import {
  BUILT_IN_THEMES,
  DARK_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  LIGHT_THEMES,
} from "@/lib/copper/themes";

const REQUIRED_COLOR_TOKENS = [
  "app-bg",
  "pane-bg",
  "list-bg",
  "editor-bg",
  "elevated-bg",
  "hover-bg",
  "active-bg",
  "selected-bg",
  "nav-selected-bg",
  "nav-selected-fg",
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "text-inverse",
  "border-subtle",
  "border-strong",
  "accent",
  "accent-hover",
  "accent-muted",
  "destructive",
  "success",
  "warning",
  "selection",
  "pill-green-bg",
  "pill-green-fg",
  "pill-orange-bg",
  "pill-orange-fg",
  "pill-red-bg",
  "pill-red-fg",
  "pill-purple-bg",
  "pill-purple-fg",
  "pill-blue-bg",
  "pill-blue-fg",
  "syntax-heading",
  "syntax-comment",
  "syntax-link",
  "syntax-code",
  "syntax-emphasis",
  "shadow-card",
  "shadow-card-selected",
] as const;

describe("built-in theme registry", () => {
  it("provides seven unique, previewable themes for each mode", () => {
    expect(LIGHT_THEMES).toHaveLength(7);
    expect(DARK_THEMES).toHaveLength(7);
    expect(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size).toBe(14);

    for (const theme of BUILT_IN_THEMES) {
      expect(theme.name).not.toHaveLength(0);
      expect(theme.description).not.toHaveLength(0);
      expect(Object.values(theme.preview)).toHaveLength(4);
      for (const swatch of Object.values(theme.preview)) {
        expect(swatch).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("normalizes missing and invalid palette IDs without losing preferences", () => {
    expect(normalizeSettings({ theme: "dark", fontSize: 18 })).toMatchObject({
      theme: "dark",
      fontSize: 18,
      lightTheme: DEFAULT_LIGHT_THEME,
      darkTheme: DEFAULT_DARK_THEME,
    });

    expect(
      normalizeSettings({
        ...defaultSettings,
        lightTheme: "invalid" as never,
        darkTheme: "also-invalid" as never,
        wrapping: false,
      }),
    ).toMatchObject({
      lightTheme: DEFAULT_LIGHT_THEME,
      darkTheme: DEFAULT_DARK_THEME,
      wrapping: false,
    });

    expect(
      normalizeSettings({ lightTheme: "meadow", darkTheme: "aurora" }),
    ).toMatchObject({ lightTheme: "meadow", darkTheme: "aurora" });
  });

  it("defines every semantic color token for every built-in palette", () => {
    const css = [
      "tokens.css",
      "theme-palette-light.css",
      "theme-palette-dark.css",
    ]
      .map((file) =>
        readFileSync(resolve(process.cwd(), "src/styles", file), "utf8"),
      )
      .join("\n");

    for (const theme of BUILT_IN_THEMES) {
      const selector = `:root[data-color-theme="${theme.id}"]`;
      const start = css.indexOf(selector);
      expect(start, `missing ${selector}`).toBeGreaterThanOrEqual(0);
      const bodyStart = css.indexOf("{", start);
      const bodyEnd = css.indexOf("}", bodyStart);
      const body = css.slice(bodyStart, bodyEnd);
      for (const token of REQUIRED_COLOR_TOKENS) {
        expect(body, `${theme.id} is missing --${token}`).toContain(
          `--${token}:`,
        );
      }
    }
  });
});
