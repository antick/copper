import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { GitStatusControl } from "@/features/git/git-status-control";
import {
  useEffectiveTheme,
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";
import { UpdateStatusControl } from "@/features/updates/update-status";

export function StatusBar({ vaultId }: { vaultId?: string }) {
  const settings = useSettings();
  const effectiveTheme = useEffectiveTheme();
  const save = useSaveSettings();
  const dark = effectiveTheme === "dark";

  return (
    <footer className="copper-status-bar">
      <GitStatusControl vaultId={vaultId} />
      <UpdateStatusControl />
      <span className="copper-header-spacer" data-copper-drag-region />
      <Tooltip content={dark ? "Light theme" : "Dark theme"}>
        <IconButton
          label="Toggle theme"
          onClick={() =>
            save.mutate({
              ...settings,
              theme: dark ? "light" : "dark",
            })
          }
        >
          {dark ? (
            <Sun size={14} strokeWidth={1.75} />
          ) : (
            <Moon size={14} strokeWidth={1.75} />
          )}
        </IconButton>
      </Tooltip>
    </footer>
  );
}
