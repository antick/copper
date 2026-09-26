import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/features/settings/settings-provider";
import { UpdateProvider } from "@/features/updates/update-provider";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <TooltipProvider>
      <SettingsProvider>
        <UpdateProvider>
          <Outlet />
        </UpdateProvider>
      </SettingsProvider>
    </TooltipProvider>
  );
}
