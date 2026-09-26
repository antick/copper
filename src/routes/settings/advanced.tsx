import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/features/settings/settings-controls";
import { AboutUpdates } from "@/features/updates/about-updates";
import { copper } from "@/lib/copper";

export const Route = createFileRoute("/settings/advanced")({
  component: AboutSettings,
});

export function AboutSettings() {
  const appInfo = useQuery({
    queryKey: ["app-info"],
    queryFn: () => copper.system.appInfo(),
  });
  return (
    <SettingsPage
      title="About & Diagnostics"
      description="Version, updates, and storage details for this Copper installation."
    >
      <SettingsSection title="Copper">
        <SettingsRow
          label="Version"
          control={<span>{appInfo.data?.version ?? "Loading…"}</span>}
        />
        <SettingsRow
          label="Platform"
          control={<span>{appInfo.data?.platform ?? "Loading…"}</span>}
        />
      </SettingsSection>
      <AboutUpdates />
    </SettingsPage>
  );
}
