import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { vaultKeys } from "@/features/vault/queries";
import { WELCOME_COPY } from "@/features/welcome/copy";
import { WelcomeStage } from "@/features/welcome/welcome-stage";
import { copper } from "@/lib/copper";

export const Route = createFileRoute("/vault/$vaultId")({
  component: VaultPage,
});

function VaultPage() {
  const { vaultId } = Route.useParams();
  const opened = useQuery({
    queryKey: vaultKeys.detail(vaultId),
    queryFn: async () => {
      const recents = await copper.vaults.list();
      const match = recents.find((item) => item.id === vaultId);
      if (!match) {
        throw new Error("This Vault is not in recents. Open it from Welcome.");
      }
      return copper.vaults.openVault(match.path);
    },
  });

  if (opened.isError) {
    return (
      <WelcomeStage layout="status">
        <div className="copper-welcome-identity">
          <h1>{WELCOME_COPY.couldNotOpen}</h1>
          <p className="copper-welcome-thesis">
            {opened.error instanceof Error
              ? opened.error.message
              : "The folder could not be opened."}
          </p>
          <Link to="/welcome" className="copper-welcome-primary">
            {WELCOME_COPY.chooseVault}
          </Link>
        </div>
      </WelcomeStage>
    );
  }

  if (!opened.data) {
    return (
      <WelcomeStage layout="status">
        <p className="copper-welcome-status">{WELCOME_COPY.opening}</p>
      </WelcomeStage>
    );
  }

  return <AppShell vaultName={opened.data.name} vaultId={opened.data.id} />;
}
