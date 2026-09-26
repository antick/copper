import { useEffect, useMemo, useState } from "react";
import {
  type CommandId,
  commandDefinitions,
  runCommand,
  shortcutLabel,
} from "@/app/commands/registry";

export function CommandMenu({
  open,
  onClose,
  platform,
  extraItems = [],
}: {
  open: boolean;
  onClose: () => void;
  platform?: string;
  extraItems?: { id: string; label: string; run: () => void }[];
}) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const commands = commandDefinitions.map((command) => ({
      id: command.id,
      label: command.label,
      hint: shortcutLabel(command, platform),
      run: () => runCommand(command.id as CommandId),
    }));
    const all = [
      ...extraItems.map((item) => ({ ...item, hint: "" })),
      ...commands,
    ];
    const needle = query.trim().toLowerCase();
    return needle
      ? all.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) ||
            item.id.includes(needle),
        )
      : all;
  }, [extraItems, platform, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="copper-command-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="copper-command-menu"
        role="dialog"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          placeholder="Run a command or open a note"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            }
            if (event.key === "Enter" && items[0]) {
              items[0].run();
              onClose();
            }
          }}
        />
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  item.run();
                  onClose();
                }}
              >
                <span>{item.label}</span>
                {item.hint ? <kbd>{item.hint}</kbd> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
