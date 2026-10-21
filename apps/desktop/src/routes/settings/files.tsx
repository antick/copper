import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsStatus,
  SettingsTextField,
} from "@/features/settings/settings-controls";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";
import { validateAttachmentFolder } from "@/lib/copper/attachment-folder";

export const Route = createFileRoute("/settings/files")({
  component: FilesSettings,
});

export function FilesSettings() {
  const settings = useSettings();
  const save = useSaveSettings();
  const errorId = useId();
  const [draft, setDraft] = useState(settings.attachmentFolder);
  const [error, setError] = useState<string | null>(null);

  function commitAttachmentFolder() {
    const result = validateAttachmentFolder(draft);
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setError(null);
    setDraft(result.folder);
    if (result.folder !== settings.attachmentFolder) {
      save.mutate({ ...settings, attachmentFolder: result.folder });
    }
  }

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
            <div className="copper-settings-inline-control">
              <SettingsTextField
                aria-label="Attachment folder"
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                spellCheck={false}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                onBlur={commitAttachmentFolder}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitAttachmentFolder();
                  }
                }}
              />
              {error ? (
                <SettingsStatus id={errorId} tone="error">
                  {error}
                </SettingsStatus>
              ) : null}
            </div>
          }
        />
      </SettingsSection>
      <p className="copper-settings-footnote">
        Tasks and projects are Markdown files kept in Copper’s hidden workspace
        area inside the Vault.
      </p>
    </SettingsPage>
  );
}
