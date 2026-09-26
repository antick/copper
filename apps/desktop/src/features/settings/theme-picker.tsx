import type { CSSProperties } from "react";
import type {
  BuiltInTheme,
  ColorThemeId,
  ThemeMode,
} from "@/lib/copper/themes";

export type AppearanceMode = "system" | ThemeMode;

export function AppearanceModePicker({
  value,
  onChange,
}: {
  value: AppearanceMode;
  onChange: (value: AppearanceMode) => void;
}) {
  return (
    <fieldset className="copper-appearance-mode" aria-label="Appearance mode">
      <legend className="sr-only">Appearance mode</legend>
      {(["system", "light", "dark"] as const).map((mode) => (
        <label key={mode} data-selected={value === mode}>
          <input
            type="radio"
            name="appearance-mode"
            value={mode}
            checked={value === mode}
            onChange={() => onChange(mode)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onChange(mode);
            }}
          />
          <span>{mode[0]?.toUpperCase() + mode.slice(1)}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function ThemeGallery({
  label,
  themes,
  selected,
  effective,
  onChange,
}: {
  label: string;
  themes: readonly BuiltInTheme[];
  selected: ColorThemeId;
  effective: ColorThemeId;
  onChange: (value: ColorThemeId) => void;
}) {
  return (
    <fieldset className="copper-theme-gallery" aria-label={label}>
      <legend className="sr-only">{label}</legend>
      {themes.map((theme) => {
        const checked = theme.id === selected;
        const active = theme.id === effective;
        const style = {
          "--theme-preview-background": theme.preview.background,
          "--theme-preview-surface": theme.preview.surface,
          "--theme-preview-text": theme.preview.text,
          "--theme-preview-accent": theme.preview.accent,
        } as CSSProperties;
        return (
          <label
            key={theme.id}
            className="copper-theme-card"
            data-selected={checked}
            data-effective={active}
            style={style}
          >
            <input
              type="radio"
              name={`theme-${theme.mode}`}
              value={theme.id}
              checked={checked}
              onChange={() => onChange(theme.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onChange(theme.id);
              }}
            />
            <span className="copper-theme-card-preview" aria-hidden="true">
              <span className="copper-theme-card-preview-sidebar" />
              <span className="copper-theme-card-preview-page">
                <span />
                <span />
              </span>
              <span className="copper-theme-card-preview-accent" />
            </span>
            <span className="copper-theme-card-copy">
              <span className="copper-theme-card-title">
                {theme.name}
                {active ? <small>Currently active</small> : null}
              </span>
              <span>{theme.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
