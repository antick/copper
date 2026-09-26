import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useNoteList } from "@/features/search/queries";
import { SearchResults } from "@/features/search/search-results";

export function VaultSearchDialog({
  open,
  onOpenChange,
  vaultId,
  selectedPath,
  onOpen,
  onPin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultId?: string;
  selectedPath?: string;
  onOpen: (path: string) => void;
  onPin: (path: string) => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useNoteList(vaultId, "all", query);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input), 150);
    return () => window.clearTimeout(timer);
  }, [input]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="copper-search-overlay" />
        <Dialog.Content
          className="copper-vault-search"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="copper-vault-search-header">
            <Search size={16} strokeWidth={1.75} />
            <Dialog.Title>Search Vault</Dialog.Title>
            <Tooltip content="Close Vault search">
              <IconButton
                label="Close Vault search"
                onClick={() => onOpenChange(false)}
              >
                <X size={15} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          </div>
          <div className="copper-vault-search-input">
            <Search size={15} strokeWidth={1.75} />
            <input
              ref={inputRef}
              value={input}
              aria-label="Search Vault"
              placeholder="Search titles and note contents…"
              onChange={(event) => setInput(event.target.value)}
            />
          </div>
          <div className="copper-vault-search-results">
            {results.isPending ? (
              <p className="copper-empty" role="status">
                Searching…
              </p>
            ) : (
              <SearchResults
                notes={results.data ?? []}
                selectedPath={selectedPath}
                onOpen={onOpen}
                onPin={(path) => {
                  onPin(path);
                  onOpenChange(false);
                }}
                emptyLabel={
                  query ? "No matching notes." : "Type to search the Vault."
                }
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
