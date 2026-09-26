import type { VaultInfo } from "@/lib/copper/vaults";

export function WelcomeFolio({
  vault,
  onOpen,
}: {
  vault: VaultInfo;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="copper-welcome-folio"
      onClick={onOpen}
      title={vault.path}
    >
      <span className="copper-welcome-folio-spine" aria-hidden="true" />
      <span className="copper-welcome-folio-body">
        <strong>{vault.name}</strong>
        <span className="copper-welcome-folio-path">{vault.path}</span>
      </span>
    </button>
  );
}
