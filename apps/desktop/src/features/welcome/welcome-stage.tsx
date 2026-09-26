import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { WELCOME_COPY } from "./copy";

export type WelcomeLayout = "recents" | "empty" | "status";

export function WelcomeStage({
  layout,
  children,
}: {
  layout: WelcomeLayout;
  children: ReactNode;
}) {
  return (
    <main className="copper-welcome" data-layout={layout}>
      <header className="copper-welcome-chrome" data-copper-drag-region>
        <span
          className="copper-welcome-chrome-spacer"
          data-copper-drag-region
        />
        <Tooltip content={WELCOME_COPY.settings}>
          <Link
            to="/settings"
            className="copper-icon-button"
            aria-label={WELCOME_COPY.settings}
          >
            <Settings size={16} strokeWidth={1.75} />
          </Link>
        </Tooltip>
      </header>
      <div className="copper-welcome-body">
        <div className="copper-welcome-column">{children}</div>
      </div>
    </main>
  );
}
