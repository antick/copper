import { createFileRoute } from "@tanstack/react-router";
import { EditorTypographyControls } from "@/features/settings/editor-typography-controls";
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
      <EditorTypographyControls />
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
