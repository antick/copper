import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HotkeysSettings } from "@/features/settings/hotkeys";
import {
  SettingsPage,
  SettingsSection,
} from "@/features/settings/settings-controls";
import { copper } from "@/lib/copper";

export const Route = createFileRoute("/settings/hotkeys")({
  component: HotkeysPage,
});

export function HotkeysPage() {
  const appInfo = useQuery({
    queryKey: ["app-info"],
    queryFn: () => copper.system.appInfo(),
  });
  return (
    <SettingsPage
      title="Hotkeys"
      description="A quick reference for keyboard-driven navigation and editing."
    >
      <SettingsSection title="Keyboard shortcuts">
        <HotkeysSettings platform={appInfo.data?.platform} />
      </SettingsSection>
    </SettingsPage>
  );
}
