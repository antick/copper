import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withDocumentWriteLock } from "@/features/editor/document-write-lock";
import { fileKeys } from "@/features/editor/file-keys";
import { useFileNameDialog } from "@/features/file-tree/file-name-dialog";
import { PropertyRow } from "@/features/properties/property-row";
import { copper } from "@/lib/copper";
import { flushOpenDocuments } from "@/lib/copper/events";

import "./properties-panel.css";

const PRIORITY = ["type", "status", "date", "tags"];

export function PropertiesPanel({
  vaultId,
  path,
  onInteraction,
}: {
  vaultId?: string;
  path?: string;
  onInteraction?: () => void;
}) {
  const queryClient = useQueryClient();
  const { requestName, nameDialog } = useFileNameDialog();
  const query = useQuery({
    queryKey:
      path && vaultId
        ? fileKeys.properties(vaultId, path)
        : ["file", "none", "properties"],
    queryFn: () => copper.properties.read(vaultId ?? "", path ?? ""),
    enabled: Boolean(vaultId && path),
  });
  const update = useMutation({
    scope: { id: `properties:${vaultId}:${path}` },
    mutationFn: async (values: Record<string, unknown>) => {
      if (!vaultId || !path) throw new Error("Select a note in a Vault first.");
      return withDocumentWriteLock(vaultId, path, async () => {
        await flushOpenDocuments(vaultId);
        const payload = await copper.properties.update(
          vaultId ?? "",
          path ?? "",
          values,
        );
        queryClient.setQueryData(
          fileKeys.detail(vaultId ?? "", path ?? ""),
          payload,
        );
        return payload;
      });
    },
    onSuccess: async () => {
      if (vaultId && path) {
        await copper.search.indexFile(vaultId, path);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: fileKeys.properties(vaultId, path),
          }),
          queryClient.invalidateQueries({
            queryKey: ["vault", vaultId, "notes"],
          }),
        ]);
      }
    },
  });

  if (!path) {
    return <p className="copper-empty">Select a note to edit frontmatter.</p>;
  }
  if (query.isError) {
    return (
      <p className="copper-empty">
        Malformed frontmatter. Fix the YAML in the note to edit properties.
      </p>
    );
  }
  if (!query.data) {
    return <p className="copper-empty">Loading properties…</p>;
  }

  const values = query.data.values;
  const HIDDEN = new Set(["title"]);
  const keys = [
    ...PRIORITY.filter((key) => key in values && !HIDDEN.has(key)),
    ...Object.keys(values).filter(
      (key) => !PRIORITY.includes(key) && !HIDDEN.has(key),
    ),
  ];

  function commit(key: string, value: unknown) {
    if (!query.data) {
      return;
    }
    onInteraction?.();
    update.mutate({ [key]: value });
  }

  function addProperty() {
    const trigger = document.activeElement;
    requestName({
      title: "Add property",
      description: "Choose a property name for this note.",
      label: "Property name",
      submitLabel: "Add property",
      onReturnFocus: () => {
        if (trigger instanceof HTMLElement) trigger.focus();
      },
      onSubmit: async (key) => {
        const latest = await copper.properties.read(vaultId ?? "", path ?? "");
        if (key in latest.values) throw new Error(`“${key}” already exists.`);
        onInteraction?.();
        await update.mutateAsync({ [key]: "" });
      },
    });
  }

  return (
    <div>
      {nameDialog}
      {update.error ? (
        <p role="alert">
          {update.error instanceof Error
            ? update.error.message
            : "The property could not be saved."}
        </p>
      ) : null}
      <fieldset disabled={update.isPending} className="copper-property-fields">
        <dl>
          {keys.length === 0 ? (
            <p className="copper-empty">No frontmatter yet.</p>
          ) : (
            keys.map((key) => (
              <PropertyRow
                key={`${path}:${key}:${JSON.stringify(values[key])}`}
                name={key}
                value={values[key]}
                onChange={(value) => commit(key, value)}
              />
            ))
          )}
        </dl>
      </fieldset>
      <div className="copper-property-actions">
        <button
          type="button"
          className="copper-text-button"
          onClick={addProperty}
        >
          Add property
        </button>
      </div>
    </div>
  );
}
