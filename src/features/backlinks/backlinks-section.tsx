import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { fileKeys } from "@/features/editor/file-keys";
import { useNoteList } from "@/features/search/queries";
import { copper } from "@/lib/copper";
import { extractWikiLinks } from "@/lib/pills";

export function BacklinksSection({
  vaultId,
  path,
  onOpen,
}: {
  vaultId?: string;
  path?: string;
  onOpen?: (path: string) => void;
}) {
  const notes = useNoteList(vaultId, "all", "");
  const properties = useQuery({
    queryKey:
      vaultId && path
        ? fileKeys.properties(vaultId, path)
        : ["file", "none", "properties"],
    queryFn: () => copper.properties.read(vaultId ?? "", path ?? ""),
    enabled: Boolean(vaultId && path),
  });
  const backlinks = useQuery({
    queryKey:
      vaultId && path
        ? fileKeys.backlinks(vaultId, path)
        : ["file", "none", "backlinks"],
    queryFn: () => copper.backlinks.list(vaultId ?? "", path ?? ""),
    enabled: Boolean(vaultId && path),
  });

  const folder = path?.includes("/")
    ? path.slice(0, path.lastIndexOf("/"))
    : "";
  const outgoing = extractWikiLinks(properties.data?.body ?? "").map((name) => {
    const match = (notes.data ?? []).find(
      (note) =>
        note.title.toLowerCase() === name.toLowerCase() ||
        note.path.toLowerCase().endsWith(`/${name.toLowerCase()}.md`) ||
        note.path.toLowerCase() === `${name.toLowerCase()}.md`,
    );
    return { name, path: match?.path };
  });

  return (
    <section className="copper-backlinks" aria-label="Backlinks">
      <RelationGroup title="Location">
        {folder ? (
          <span
            className="copper-pill copper-location-pill"
            style={{
              background: "var(--pill-purple-bg)",
              color: "var(--pill-purple-fg)",
            }}
          >
            {folder}
          </span>
        ) : (
          <p className="copper-empty">Vault root</p>
        )}
      </RelationGroup>
      <RelationGroup title="Has Notes">
        {outgoing.length > 0 ? (
          outgoing.map((link) =>
            link.path ? (
              <button
                key={link.name}
                type="button"
                onClick={() => onOpen?.(link.path as string)}
              >
                <FileText size={12} strokeWidth={1.75} />
                {link.name}
              </button>
            ) : (
              <span key={link.name} className="copper-unresolved-link">
                <FileText size={12} strokeWidth={1.75} />
                {link.name} (unresolved)
              </span>
            ),
          )
        ) : (
          <p className="copper-empty">No outgoing links.</p>
        )}
      </RelationGroup>
      <RelationGroup title="Related to">
        {backlinks.data && backlinks.data.length > 0 ? (
          backlinks.data.map((link) => (
            <button
              key={`${link.sourcePath}:${link.targetRaw}`}
              type="button"
              onClick={() => onOpen?.(link.sourcePath)}
            >
              <FileText size={12} strokeWidth={1.75} />
              {noteTitle(link.sourcePath)}
            </button>
          ))
        ) : (
          <p className="copper-empty">No backlinks yet.</p>
        )}
      </RelationGroup>
    </section>
  );
}

function noteTitle(path: string) {
  return path.split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
}

function RelationGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="copper-section-label">{title}</div>
      <div className="copper-relation-list">{children}</div>
    </>
  );
}
