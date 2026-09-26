import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  FileText,
  Info,
  Keyboard,
  LayoutPanelLeft,
  Palette,
  Search,
  TextCursorInput,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { guessPlatform } from "@/lib/copper/platform";

export const SETTINGS_NAV = [
  { to: "/settings/appearance", label: "Appearance", icon: Palette },
  { to: "/settings/editor", label: "Editor", icon: TextCursorInput },
  { to: "/settings/files", label: "Files & Links", icon: FileText },
  { to: "/settings/workspace", label: "Workspace", icon: LayoutPanelLeft },
  { to: "/settings/search", label: "Search & Indexing", icon: Search },
  { to: "/settings/hotkeys", label: "Hotkeys", icon: Keyboard },
  { to: "/settings/advanced", label: "About & Diagnostics", icon: Info },
] as const;

export type SettingsPath = (typeof SETTINGS_NAV)[number]["to"];

export function SettingsLayout({
  children,
  overlay = false,
  activeTo,
  onNavigate,
  onClose,
}: {
  children?: ReactNode;
  overlay?: boolean;
  activeTo?: SettingsPath;
  onNavigate?: (to: SettingsPath) => void;
  onClose?: () => void;
}) {
  const navigate = useNavigate();

  function closeSettings() {
    if (onClose) {
      onClose();
      return;
    }
    const vaultId = sessionStorage.getItem("copper:active-vault-id");
    if (vaultId) {
      void navigate({ to: "/vault/$vaultId", params: { vaultId } });
      return;
    }
    void navigate({ to: "/welcome" });
  }

  return (
    <main className="copper-settings" data-platform={guessPlatform()}>
      <aside aria-label="Settings categories">
        <div className="copper-settings-title" data-copper-drag-region>
          <div>
            <span className="copper-settings-eyebrow">Copper</span>
            <h1>Settings</h1>
          </div>
          <Tooltip content={overlay ? "Back to notes" : "Close settings"}>
            <IconButton
              label={overlay ? "Back to notes" : "Close settings"}
              onClick={closeSettings}
            >
              {overlay ? (
                <ChevronLeft size={16} strokeWidth={1.75} />
              ) : (
                <X size={16} strokeWidth={1.75} />
              )}
            </IconButton>
          </Tooltip>
        </div>
        <nav>
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            if (overlay) {
              return (
                <button
                  key={item.to}
                  type="button"
                  className="copper-settings-nav-item"
                  data-active={activeTo === item.to}
                  onClick={() => onNavigate?.(item.to)}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className="copper-settings-nav-item"
                activeProps={{ "data-active": true }}
              >
                <Icon size={15} strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {overlay ? (
          <button
            type="button"
            className="copper-settings-vaults-link"
            onClick={() => {
              onClose?.();
              void navigate({ to: "/welcome" });
            }}
          >
            Open another Vault…
          </button>
        ) : (
          <Link to="/welcome" className="copper-settings-vaults-link">
            Open another Vault…
          </Link>
        )}
      </aside>
      <span
        className="copper-settings-drag-region"
        data-copper-drag-region
        aria-hidden="true"
      />
      <div className="copper-settings-content">{children ?? <Outlet />}</div>
    </main>
  );
}
