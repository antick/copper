import { useRef, useState } from "react";
import { TaskArchivedItemsDialog } from "@/features/tasks/task-archived-items-dialog";
import type { TaskProject } from "@/lib/copper/tasks";

export function useTaskArchivedItemsDialog(
  vaultId: string,
  projects: TaskProject[],
  projectsLoading: boolean,
) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  return {
    show: () => {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setOpen(true);
    },
    dialog: (
      <TaskArchivedItemsDialog
        open={open}
        vaultId={vaultId}
        projects={projects}
        projectsLoading={projectsLoading}
        onClose={() => setOpen(false)}
        onReturnFocus={() =>
          opener.current?.isConnected && opener.current.focus()
        }
      />
    ),
  };
}
