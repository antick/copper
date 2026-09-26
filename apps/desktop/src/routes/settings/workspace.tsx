import { createFileRoute } from "@tanstack/react-router";
import { IssuePrefixSetting } from "@/features/settings/issue-prefix-setting";
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
} from "@/features/settings/settings-controls";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";

export const Route = createFileRoute("/settings/workspace")({
  component: WorkspaceSettings,
});

export function WorkspaceSettings() {
  const settings = useSettings();
  const save = useSaveSettings();
  return (
    <SettingsPage
      title="Workspace"
      description="Choose one focused way to browse notes in every Vault."
    >
      <SettingsSection title="Navigation layout">
        <SettingsRow
          label="Browse files with"
          description="Note list keeps the tree folder-only. File tree removes the middle list and shows Markdown files beside folders."
          control={
            <SettingsSelect
              aria-label="Navigation layout"
              value={settings.navigationLayout}
              onChange={(event) =>
                save.mutate({
                  ...settings,
                  navigationLayout: event.target
                    .value as typeof settings.navigationLayout,
                })
              }
            >
              <option value="note-list">Folder tree + note list</option>
              <option value="tree">File tree</option>
            </SettingsSelect>
          }
        />
      </SettingsSection>
      <SettingsSection title="Tasks">
        <IssuePrefixSetting />
      </SettingsSection>
      <p className="copper-settings-footnote">
        Search and Quick Open remain available in either layout. Switching does
        not move or rewrite any files.
      </p>
    </SettingsPage>
  );
}
