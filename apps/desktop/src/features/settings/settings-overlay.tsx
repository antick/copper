import { type ReactNode, useState } from "react";
import {
  SETTINGS_NAV,
  SettingsLayout,
  type SettingsPath,
} from "@/features/settings/settings-layout";
import { AboutSettings } from "@/routes/settings/advanced";
import { AppearanceSettings } from "@/routes/settings/appearance";
import { EditorSettings } from "@/routes/settings/editor";
import { FilesSettings } from "@/routes/settings/files";
import { HotkeysPage } from "@/routes/settings/hotkeys";
import { SearchSettings } from "@/routes/settings/search";
import { WorkspaceSettings } from "@/routes/settings/workspace";

const PAGES: Record<SettingsPath, () => ReactNode> = {
  "/settings/appearance": () => <AppearanceSettings />,
  "/settings/editor": () => <EditorSettings />,
  "/settings/files": () => <FilesSettings />,
  "/settings/workspace": () => <WorkspaceSettings />,
  "/settings/search": () => <SearchSettings />,
  "/settings/hotkeys": () => <HotkeysPage />,
  "/settings/advanced": () => <AboutSettings />,
};

export function SettingsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTo, setActiveTo] = useState<SettingsPath>(SETTINGS_NAV[0].to);
  if (!open) {
    return null;
  }
  const Page = PAGES[activeTo];
  return (
    <div className="copper-settings-overlay">
      <SettingsLayout
        overlay
        activeTo={activeTo}
        onNavigate={setActiveTo}
        onClose={onClose}
      >
        {Page()}
      </SettingsLayout>
    </div>
  );
}
