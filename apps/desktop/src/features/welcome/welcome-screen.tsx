import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { vaultKeys } from "@/features/vault/queries";
import { copper } from "@/lib/copper";
import { WELCOME_COPY, welcomeOpenError } from "./copy";
import { WelcomeFolio } from "./welcome-folio";
import { WelcomeMark } from "./welcome-mark";
import { WelcomeStage } from "./welcome-stage";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [openError, setOpenError] = useState<string>();
  const recent = useQuery({
    queryKey: vaultKeys.all,
    queryFn: () => copper.vaults.list(),
  });
  const recents = recent.data ?? [];
  const layout = recents.length > 0 ? "recents" : "empty";

  async function openVault(path?: string) {
    setOpenError(undefined);
    try {
      const vault = path
        ? await copper.vaults.openVault(path)
        : await copper.vaults.pickAndOpen();
      if (!vault) return;
      await navigate({
        to: "/vault/$vaultId",
        params: { vaultId: vault.id },
      });
    } catch (error) {
      setOpenError(welcomeOpenError(error));
    }
  }

  return (
    <WelcomeStage layout={layout}>
      <div className="copper-welcome-identity">
        <div className="copper-welcome-wordmark">
          <WelcomeMark />
          <h1>{WELCOME_COPY.heading}</h1>
        </div>
        <p className="copper-welcome-thesis">{WELCOME_COPY.thesis}</p>
        {layout === "empty" ? (
          <p className="copper-welcome-invite">{WELCOME_COPY.invitation}</p>
        ) : null}
        <button
          type="button"
          className="copper-welcome-primary"
          onClick={() => void openVault()}
        >
          {WELCOME_COPY.openVault}
        </button>
        {openError ? (
          <p className="copper-welcome-error" role="alert">
            {openError}
          </p>
        ) : null}
        <p className="copper-welcome-footnote">{WELCOME_COPY.footnote}</p>
      </div>
      {recents.length > 0 ? (
        <section
          className="copper-welcome-recents"
          aria-labelledby="copper-welcome-recents-heading"
        >
          <h2 id="copper-welcome-recents-heading">
            {WELCOME_COPY.recentHeading}
          </h2>
          <ul>
            {recents.map((vault) => (
              <li key={vault.id}>
                <WelcomeFolio
                  vault={vault}
                  onOpen={() => void openVault(vault.path)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </WelcomeStage>
  );
}
