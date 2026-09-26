import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsStatus,
} from "@/features/settings/settings-controls";
import { copper } from "@/lib/copper";

export const Route = createFileRoute("/settings/search")({
  component: SearchSettings,
});

export function SearchSettings() {
  const vaultId = sessionStorage.getItem("copper:active-vault-id");
  const [status, setStatus] = useState<string>();
  const rebuilding = status === "Rebuilding index…";

  async function rebuild() {
    if (!vaultId) return;
    setStatus("Rebuilding index…");
    try {
      const count = await copper.search.rebuild(vaultId);
      setStatus(`Indexed ${count} Markdown ${count === 1 ? "file" : "files"}.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The index could not be rebuilt.",
      );
    }
  }

  return (
    <SettingsPage
      title="Search & Indexing"
      description="Manage Copper’s disposable local search index."
    >
      <SettingsSection title="Current Vault">
        <SettingsRow
          label="Rebuild search index"
          description="Use this after unusual external changes. Rebuilding never edits or deletes Markdown files."
          control={
            <button
              type="button"
              className="copper-settings-action"
              disabled={!vaultId || rebuilding}
              onClick={() => void rebuild()}
            >
              {rebuilding ? "Rebuilding…" : "Rebuild index"}
            </button>
          }
        />
      </SettingsSection>
      {!vaultId ? (
        <p className="copper-settings-footnote">
          Open a Vault before rebuilding its index.
        </p>
      ) : null}
      {status ? <SettingsStatus>{status}</SettingsStatus> : null}
    </SettingsPage>
  );
}
