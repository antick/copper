import { createFileRoute } from "@tanstack/react-router";
import {
  SettingsPage,
  SettingsSection,
} from "@/features/settings/settings-controls";
import {
  useEffectiveColorTheme,
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";
import {
  AppearanceModePicker,
  ThemeGallery,
} from "@/features/settings/theme-picker";
import {
  DARK_THEMES,
  type DarkThemeId,
  LIGHT_THEMES,
  type LightThemeId,
} from "@/lib/copper/themes";

export const Route = createFileRoute("/settings/appearance")({
  component: AppearanceSettings,
});

export function AppearanceSettings() {
  const settings = useSettings();
  const effectiveColorTheme = useEffectiveColorTheme();
  const save = useSaveSettings();

  return (
    <SettingsPage
      title="Appearance"
      description="Choose a calm palette for daylight and low-light work. System mode follows your Mac while remembering both choices."
    >
      <SettingsSection
        title="Color mode"
        description="Follow the operating system or keep Copper consistently light or dark."
      >
        <div className="copper-appearance-mode-row">
          <AppearanceModePicker
            value={settings.theme}
            onChange={(theme) => save.mutate({ ...settings, theme })}
          />
        </div>
      </SettingsSection>
      <SettingsSection
        title="Light themes"
        description="Warm and neutral palettes designed for long reading sessions."
      >
        <ThemeGallery
          label="Light themes"
          themes={LIGHT_THEMES}
          selected={settings.lightTheme}
          effective={effectiveColorTheme}
          onChange={(lightTheme) =>
            save.mutate({
              ...settings,
              lightTheme: lightTheme as LightThemeId,
            })
          }
        />
      </SettingsSection>
      <SettingsSection
        title="Dark themes"
        description="Low-glare palettes with soft contrast and clear focus states."
      >
        <ThemeGallery
          label="Dark themes"
          themes={DARK_THEMES}
          selected={settings.darkTheme}
          effective={effectiveColorTheme}
          onChange={(darkTheme) =>
            save.mutate({
              ...settings,
              darkTheme: darkTheme as DarkThemeId,
            })
          }
        />
      </SettingsSection>
    </SettingsPage>
  );
}
