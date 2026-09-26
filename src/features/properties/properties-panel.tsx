import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fileKeys } from "@/features/editor/file-keys";
import { PropertyRow } from "@/features/properties/property-row";
import { copper } from "@/lib/copper";
import type { Frontmatter } from "@/lib/copper/properties";

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
  const query = useQuery({
    queryKey:
      path && vaultId
        ? fileKeys.properties(vaultId, path)
        : ["file", "none", "properties"],
    queryFn: () => copper.properties.read(vaultId ?? "", path ?? ""),
    enabled: Boolean(vaultId && path),
  });
  const update = useMutation({
    mutationFn: (properties: Frontmatter) =>
      copper.properties.update(vaultId ?? "", path ?? "", properties),
    onSuccess: async () => {
      if (vaultId && path) {
        await copper.search.indexFile(vaultId, path);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: fileKeys.properties(vaultId, path),
          }),
          queryClient.invalidateQueries({
            queryKey: fileKeys.detail(vaultId, path),
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
    update.mutate({
      ...query.data,
      values: { ...query.data.values, [key]: value },
    });
  }

  function addProperty() {
    const key = window.prompt("Property name")?.trim();
    if (!key || !query.data) return;
    if (key in query.data.values) {
      window.alert(`“${key}” already exists.`);
      return;
    }
    commit(key, "");
  }

  return (
    <div>
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
