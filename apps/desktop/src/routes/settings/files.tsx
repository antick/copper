import { createFileRoute } from "@tanstack/react-router";
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsTextField,
} from "@/features/settings/settings-controls";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";

export const Route = createFileRoute("/settings/files")({
  component: FilesSettings,
});

export function FilesSettings() {
  const settings = useSettings();
  const save = useSaveSettings();
  return (
    <SettingsPage
      title="Files & Links"
      description="Control where local attachments are written inside a Vault."
    >
      <SettingsSection title="Attachments">
        <SettingsRow
          label="Attachment folder"
          description="Relative Vault folder used when files are dropped into the editor."
          control={
            <SettingsTextField
              aria-label="Attachment folder"
              spellCheck={false}
              value={settings.attachmentFolder}
              onChange={(event) =>
                save.mutate({
                  ...settings,
                  attachmentFolder: event.target.value,
                })
              }
            />
          }
        />
      </SettingsSection>
      <p className="copper-settings-footnote">
        Markdown files remain the source of truth. Copper never creates a hidden
        metadata folder in your Vault.
      </p>
    </SettingsPage>
  );
}
