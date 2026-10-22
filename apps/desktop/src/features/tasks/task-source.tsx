import * as ContextMenu from "@radix-ui/react-context-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Code2 } from "lucide-react";
import { createContext, type ReactNode, useContext, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { fileKeys } from "@/features/editor/file-keys";
import { isMarkdownPath } from "@/features/file-tree/file-names";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { copper } from "@/lib/copper";
import { flushOpenDocuments } from "@/lib/copper/events";

const TaskSourceContext = createContext<
  ((path: string) => Promise<void>) | null
>(null);

export function TaskSourceProvider({
  vaultId,
  onOpen,
  children,
}: {
  vaultId: string;
  onOpen: (path: string) => void;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  async function open(path: string) {
    try {
      if (!isMarkdownPath(path))
        throw new Error("This task has no Markdown source file.");
      await flushOpenDocuments(vaultId);
      const payload = await copper.files.read(vaultId, path);
      queryClient.setQueryData(fileKeys.detail(vaultId, path), payload);
      onOpen(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    }
  }
  return (
    <TaskSourceContext.Provider value={open}>
      {children}
      <SettingsDialog
        title="Couldn’t open source"
        description={error ?? ""}
        open={Boolean(error)}
        onOpenChange={(open) => {
          if (!open) setError(null);
        }}
      >
        {null}
      </SettingsDialog>
    </TaskSourceContext.Provider>
  );
}

export function TaskSourceMenuItem({ path }: { path: string }) {
  const open = useContext(TaskSourceContext);
  if (!open) return null;
  return (
    <ContextMenu.Item
      className="copper-menu-item copper-menu-item-with-icon"
      onSelect={() => void open(path)}
    >
      <Code2 size={14} aria-hidden /> Edit source
    </ContextMenu.Item>
  );
}

export function TaskSourceButton({ path }: { path: string }) {
  const open = useContext(TaskSourceContext);
  if (!open) return null;
  return (
    <Tooltip content="Edit source">
      <IconButton label="Edit source" onClick={() => void open(path)}>
        <Code2 size={15} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}
