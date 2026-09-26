import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { useEffect, useState } from "react";
import { GIT_SUCCESS_NOTICE_MS } from "@/features/git/constants";
import { gitControlLabel, publishCommandLabel } from "@/features/git/copy";
import { GitDiffView } from "@/features/git/git-diff-view";
import { useVaultGit } from "@/features/git/use-vault-git";
import { copper } from "@/lib/copper";
import { fileName } from "@/lib/paths";

export function GitStatusControl({ vaultId }: { vaultId?: string }) {
  const queryClient = useQueryClient();
  const [enabling, setEnabling] = useState(false);
  const { status, running, publish, result, resetResult } =
    useVaultGit(vaultId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const label = gitControlLabel({
    status,
    running,
    result: running ? null : result,
  });
  const paths = status.kind === "git" ? status.paths : [];
  const count =
    status.kind === "git" ? Math.max(status.noteCount, status.behind) : 0;
  const diff = useQuery({
    queryKey: ["vault", vaultId, "git-diff", selected],
    enabled: Boolean(vaultId && open && selected),
    queryFn: () => copper.git.diff(vaultId ?? "", selected ?? ""),
  });

  useEffect(() => {
    if (!result || running) {
      return;
    }
    const timer = window.setTimeout(() => {
      resetResult();
      setOpen(false);
    }, GIT_SUCCESS_NOTICE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [result, running, resetResult]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelected(paths[0]);
  }, [open, paths]);

  if (status.kind === "untrusted") {
    return (
      <button
        type="button"
        className="copper-status-git"
        disabled={enabling}
        onClick={async () => {
          if (!vaultId) return;
          setEnabling(true);
          try {
            await copper.git.enable(vaultId);
            await queryClient.invalidateQueries({
              queryKey: ["vault", vaultId],
            });
          } catch {
            // The main process keeps Git disabled when confirmation fails.
          } finally {
            setEnabling(false);
          }
        }}
      >
        Enable Git
      </button>
    );
  }

  if (!label || (label === "Up to date" && !running && !result)) {
    return null;
  }

  const reviewLabel =
    count > 0 ? `Review ${count} Git change${count === 1 ? "" : "s"}` : label;

  const actionLabel = running
    ? status.kind === "git" && status.behind > 0 && status.noteCount === 0
      ? "Updating…"
      : "Pushing…"
    : result
      ? label
      : status.kind === "git"
        ? publishCommandLabel(status.host)
        : "Push";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="copper-status-git"
          aria-live="polite"
          aria-label={reviewLabel}
        >
          <GitBranch size={13} strokeWidth={1.75} />
          {count > 0 ? <span>{count} changes</span> : null}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="copper-git-review-overlay" />
        <Dialog.Content
          className="copper-git-review"
          aria-describedby={undefined}
        >
          <Dialog.Title className="copper-git-review-title">
            Review Git changes
          </Dialog.Title>
          <div className="copper-git-review-body">
            <div className="copper-git-popover-list">
              {paths.length === 0 ? (
                <p className="copper-empty">No local file changes.</p>
              ) : (
                paths.map((path) => (
                  <button
                    key={path}
                    type="button"
                    className="copper-git-file"
                    data-selected={path === selected}
                    onClick={() => setSelected(path)}
                  >
                    {fileName(path)}
                  </button>
                ))
              )}
            </div>
            <GitDiffView
              empty={paths.length === 0}
              binary={diff.data?.binary}
              text={diff.data?.text}
            />
          </div>
          <div className="copper-git-review-footer">
            <span className="copper-git-review-status">
              {running ? actionLabel : result ? label : null}
            </span>
            <button
              type="button"
              className="copper-git-publish"
              disabled={running}
              onClick={() => {
                if (running) return;
                void publish();
              }}
            >
              {actionLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
