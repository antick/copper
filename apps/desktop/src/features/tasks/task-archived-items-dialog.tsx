import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fileKeys } from "@/features/editor/file-keys";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { ProjectIcon } from "@/features/tasks/project-icons";
import { taskKeys } from "@/features/tasks/queries";
import { copper } from "@/lib/copper";
import {
  flushOpenDocuments,
  invalidateVaultNoteQueries,
} from "@/lib/copper/events";
import {
  isArchivedTaskSourcePath,
  type TaskIssue,
  type TaskProject,
} from "@/lib/copper/tasks";
import "./task-archived-items.css";

export function TaskArchivedItemsDialog({
  open,
  vaultId,
  projects,
  projectsLoading,
  onClose,
  onReturnFocus,
}: {
  open: boolean;
  vaultId: string;
  projects: TaskProject[];
  projectsLoading: boolean;
  onClose: () => void;
  onReturnFocus?: () => void;
}) {
  const queryClient = useQueryClient();
  const [restoringPath, setRestoringPath] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const issuesQuery = useQuery({
    queryKey: [...taskKeys.issues(vaultId), "archived"],
    queryFn: () => copper.tasks.listIssues(vaultId, { includeArchived: true }),
    enabled: open,
  });
  const archivedIssues = useMemo(
    () =>
      (issuesQuery.data ?? []).filter((issue) =>
        isArchivedTaskSourcePath(issue.path),
      ),
    [issuesQuery.data],
  );
  const archivedProjects = projects.filter((project) => project.archived);

  async function restore(path: string) {
    setRestoringPath(path);
    setRestoreError(null);
    try {
      await flushOpenDocuments();
      const restoredPath = await copper.files.restore(vaultId, path);
      const indexResults = await Promise.allSettled([
        copper.search.removeIndexed(vaultId, path),
        copper.search.indexFile(vaultId, restoredPath),
      ]);
      const indexFailure = indexResults.find(
        (result) => result.status === "rejected",
      );
      if (indexFailure?.status === "rejected") {
        setRestoreError(
          `Restored the item, but its index could not be refreshed: ${indexFailure.reason instanceof Error ? indexFailure.reason.message : String(indexFailure.reason)}`,
        );
      }
      queryClient.removeQueries({ queryKey: fileKeys.detail(vaultId, path) });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: fileKeys.detail(vaultId, restoredPath),
        }),
        queryClient.invalidateQueries({ queryKey: taskKeys.issues(vaultId) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.projects(vaultId) }),
        invalidateVaultNoteQueries(vaultId),
      ]);
    } catch (cause) {
      setRestoreError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Could not restore this item. Try again.",
      );
    } finally {
      setRestoringPath(null);
    }
  }

  const hasArchivedItems =
    archivedProjects.length > 0 || archivedIssues.length > 0;
  const loading = projectsLoading || issuesQuery.isPending;

  return (
    <SettingsDialog
      title="Archived items"
      description="Restore archived projects and issues to Tasks."
      open={open}
      onOpenChange={(next) => !next && onClose()}
      onReturnFocus={onReturnFocus}
    >
      <div className="copper-task-archived-items">
        {restoreError ? <p role="alert">{restoreError}</p> : null}
        {issuesQuery.isError ? (
          <p role="alert">Archived issues could not be loaded.</p>
        ) : null}
        {loading ? <p role="status">Loading archived items…</p> : null}
        {!loading && !issuesQuery.isError && !hasArchivedItems ? (
          <p>No archived projects or issues.</p>
        ) : null}
        {archivedProjects.length ? (
          <section aria-labelledby="archived-projects-heading">
            <h3 id="archived-projects-heading">Projects</h3>
            <ul>
              {archivedProjects.map((project) => (
                <ArchivedItem
                  key={project.id}
                  item={project}
                  restoring={restoringPath === project.path}
                  disabled={restoringPath !== null}
                  onRestore={() => void restore(project.path)}
                />
              ))}
            </ul>
          </section>
        ) : null}
        {archivedIssues.length ? (
          <section aria-labelledby="archived-issues-heading">
            <h3 id="archived-issues-heading">Issues</h3>
            <ul>
              {archivedIssues.map((issue) => (
                <ArchivedIssue
                  key={issue.id}
                  issue={issue}
                  restoring={restoringPath === issue.path}
                  disabled={restoringPath !== null}
                  onRestore={() => void restore(issue.path)}
                />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SettingsDialog>
  );
}

function ArchivedItem({
  item,
  restoring,
  disabled,
  onRestore,
}: {
  item: TaskProject;
  restoring: boolean;
  disabled: boolean;
  onRestore: () => void;
}) {
  return (
    <li>
      <span>
        <ProjectIcon name={item.icon} size={14} />
        {item.title}
      </span>
      <button
        type="button"
        className="copper-text-button"
        aria-label={`Restore ${item.title}`}
        disabled={disabled}
        onClick={onRestore}
      >
        {restoring ? "Restoring…" : "Restore"}
      </button>
    </li>
  );
}

function ArchivedIssue({
  issue,
  restoring,
  disabled,
  onRestore,
}: {
  issue: TaskIssue;
  restoring: boolean;
  disabled: boolean;
  onRestore: () => void;
}) {
  return (
    <li>
      <span>
        <span className="copper-task-id">{issue.id}</span>
        {issue.title}
      </span>
      <button
        type="button"
        className="copper-text-button"
        aria-label={`Restore ${issue.id}: ${issue.title}`}
        disabled={disabled}
        onClick={onRestore}
      >
        {restoring ? "Restoring…" : "Restore"}
      </button>
    </li>
  );
}
