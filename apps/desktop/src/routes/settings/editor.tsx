import { createFileRoute } from "@tanstack/react-router";
import {
  SettingsNumberField,
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "@/features/settings/settings-controls";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";

export const Route = createFileRoute("/settings/editor")({
  component: EditorSettings,
});

export function EditorSettings() {
  const settings = useSettings();
  const save = useSaveSettings();
  return (
    <SettingsPage
      title="Editor"
      description="Tune Markdown editing for comfortable reading and writing."
    >
      <SettingsSection title="Typography">
        <SettingsRow
          label="Font size"
          description="Editor text size in pixels."
          control={
            <SettingsNumberField
              aria-label="Editor font size"
              min={11}
              max={22}
              value={settings.fontSize}
              onChange={(event) =>
                save.mutate({
                  ...settings,
                  fontSize: Number(event.target.value),
                })
              }
            />
          }
        />
        <SettingsRow
          label="Line height"
          description="Vertical spacing between editor lines."
          control={
            <SettingsNumberField
              aria-label="Editor line height"
              step={0.05}
              min={1.2}
              max={2}
              value={settings.lineHeight}
              onChange={(event) =>
                save.mutate({
                  ...settings,
                  lineHeight: Number(event.target.value),
                })
              }
            />
          }
        />
      </SettingsSection>
      <SettingsSection title="Editing">
        <SettingsRow
          label="Tab size"
          description="Number of spaces represented by a tab."
          control={
            <SettingsNumberField
              aria-label="Tab size"
              min={2}
              max={8}
              value={settings.tabSize}
              onChange={(event) =>
                save.mutate({
                  ...settings,
                  tabSize: Number(event.target.value),
                })
              }
            />
          }
        />
        <SettingsRow
          label="Wrap long lines"
          description="Keep long Markdown lines inside the editor viewport."
          control={
            <SettingsSwitch
              label="Wrap long lines"
              checked={settings.wrapping}
              onCheckedChange={(wrapping) =>
                save.mutate({ ...settings, wrapping })
              }
            />
          }
        />
      </SettingsSection>
    </SettingsPage>
  );
}
