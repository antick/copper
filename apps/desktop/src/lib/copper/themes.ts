export const LIGHT_THEME_IDS = [
  "linen",
  "porcelain",
  "dawn",
  "solarized-light",
  "sandstone",
  "meadow",
  "tidepool",
] as const;

export const DARK_THEME_IDS = [
  "graphite",
  "midnight",
  "rose-pine",
  "nord",
  "ember",
  "inkwell",
  "aurora",
] as const;

export type LightThemeId = (typeof LIGHT_THEME_IDS)[number];
export type DarkThemeId = (typeof DARK_THEME_IDS)[number];
export type ColorThemeId = LightThemeId | DarkThemeId;
export type ThemeMode = "light" | "dark";

export interface ThemePreview {
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export interface BuiltInTheme<Id extends ColorThemeId = ColorThemeId> {
  id: Id;
  name: string;
  mode: ThemeMode;
  description: string;
  preview: ThemePreview;
}

export const DEFAULT_LIGHT_THEME: LightThemeId = "linen";
export const DEFAULT_DARK_THEME: DarkThemeId = "graphite";

export const BUILT_IN_THEMES = [
  {
    id: "linen",
    name: "Linen",
    mode: "light",
    description: "Warm paper and a restrained copper accent.",
    preview: {
      background: "#f3efe8",
      surface: "#fffdf9",
      text: "#27231f",
      accent: "#8f4f36",
    },
  },
  {
    id: "porcelain",
    name: "Porcelain",
    mode: "light",
    description: "Crisp cool neutrals with a calm blue focus.",
    preview: {
      background: "#f2f5f7",
      surface: "#ffffff",
      text: "#202a35",
      accent: "#3f6296",
    },
  },
  {
    id: "dawn",
    name: "Dawn",
    mode: "light",
    description: "Soft blush surfaces and muted rose details.",
    preview: {
      background: "#f8f1f0",
      surface: "#fffafa",
      text: "#352a31",
      accent: "#8b5267",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    mode: "light",
    description: "Low-glare ivory with balanced blue and cyan.",
    preview: {
      background: "#eee8d5",
      surface: "#fdf6e3",
      text: "#40565e",
      accent: "#176f9c",
    },
  },
  {
    id: "sandstone",
    name: "Sandstone",
    mode: "light",
    description: "Sun-warmed neutrals with a grounded amber accent.",
    preview: {
      background: "#f2eee5",
      surface: "#fffaf0",
      text: "#3b3429",
      accent: "#a6632f",
    },
  },
  {
    id: "meadow",
    name: "Meadow",
    mode: "light",
    description: "Fresh sage surfaces with a quiet woodland green.",
    preview: {
      background: "#eef3eb",
      surface: "#fbfdf8",
      text: "#25352a",
      accent: "#39704c",
    },
  },
  {
    id: "tidepool",
    name: "Tidepool",
    mode: "light",
    description: "Sea-glass neutrals with a clear teal focus.",
    preview: {
      background: "#edf4f2",
      surface: "#fbfefd",
      text: "#203536",
      accent: "#2f7480",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    mode: "dark",
    description: "Quiet near-black surfaces with clear blue focus.",
    preview: {
      background: "#111113",
      surface: "#1f1f23",
      text: "#f4f4f5",
      accent: "#60a5fa",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    description: "Deep navy layers and a soft periwinkle accent.",
    preview: {
      background: "#0d1526",
      surface: "#17233a",
      text: "#e6edf7",
      accent: "#82aaff",
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    mode: "dark",
    description: "Aubergine shadows with gentle iris and rose.",
    preview: {
      background: "#191724",
      surface: "#26233a",
      text: "#e0def4",
      accent: "#c4a7e7",
    },
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
    description: "Arctic blue-gray surfaces and frost-cyan focus.",
    preview: {
      background: "#2e3440",
      surface: "#3b4252",
      text: "#eceff4",
      accent: "#88c0d0",
    },
  },
  {
    id: "ember",
    name: "Ember",
    mode: "dark",
    description: "Charcoal warmth with a soft ember glow.",
    preview: {
      background: "#1b1414",
      surface: "#2d2020",
      text: "#f7e8e1",
      accent: "#e88a68",
    },
  },
  {
    id: "inkwell",
    name: "Inkwell",
    mode: "dark",
    description: "Deep blue-black layers with an inky periwinkle focus.",
    preview: {
      background: "#101521",
      surface: "#202b41",
      text: "#e8effd",
      accent: "#8aa7e8",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    mode: "dark",
    description: "A still, low-contrast night sky with a teal focus.",
    preview: {
      background: "#0d181a",
      surface: "#193034",
      text: "#e8f8f5",
      accent: "#64d4c5",
    },
  },
] as const satisfies readonly BuiltInTheme[];

export const LIGHT_THEMES = BUILT_IN_THEMES.filter(
  (theme): theme is (typeof BUILT_IN_THEMES)[number] & { mode: "light" } =>
    theme.mode === "light",
);

export const DARK_THEMES = BUILT_IN_THEMES.filter(
  (theme): theme is (typeof BUILT_IN_THEMES)[number] & { mode: "dark" } =>
    theme.mode === "dark",
);

export function isLightThemeId(value: unknown): value is LightThemeId {
  return LIGHT_THEME_IDS.includes(value as LightThemeId);
}

export function isDarkThemeId(value: unknown): value is DarkThemeId {
  return DARK_THEME_IDS.includes(value as DarkThemeId);
}
