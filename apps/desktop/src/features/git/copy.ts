import type {
  GitFailReason,
  GitHostKind,
  GitPublishResult,
  GitStatus,
} from "@/lib/copper/git";

export function remoteLabel(host: GitHostKind): string {
  return host === "github" ? "GitHub" : "remote";
}

export function publishCommandLabel(host: GitHostKind): string {
  return host === "github" ? "Push vault to GitHub" : "Push vault to remote";
}

export function gitReasonCopy(reason: GitFailReason): string {
  switch (reason) {
    case "not_git":
      return "This folder isn’t a Git repository";
    case "no_git_bin":
      return "Git is not installed";
    case "no_remote":
      return "This folder has Git, but no remote";
    case "no_identity":
      return "Git needs a name and email";
    case "merging":
      return "This folder is already merging in Git";
    case "detached":
      return "This folder isn’t on a Git branch";
    case "rebase":
    case "cherry_pick":
    case "revert":
      return "This folder isn’t in a state Copper can publish";
    case "auth":
      return "Sign in with the Git this folder already uses";
    case "timeout":
      return "Git timed out";
    case "combine_failed":
      return "Couldn’t combine notes from the remote";
    case "io":
      return "Couldn’t reach the Git remote";
    default:
      return "Couldn’t publish notes";
  }
}

export function gitIdleLabel(status: GitStatus): string | null {
  if (status.kind !== "git") {
    return null;
  }
  if (status.blockReason) {
    return gitReasonCopy(status.blockReason);
  }
  if (status.noteCount > 0 || status.ahead > 0) {
    const count = Math.max(status.noteCount, status.ahead);
    return count === 1 ? "Push 1 note" : `Push ${count} notes`;
  }
  if (status.behind > 0) {
    return `Update from ${remoteLabel(status.host)}`;
  }
  return "Up to date";
}

export function gitBusyLabel(status: GitStatus): string {
  if (
    status.kind === "git" &&
    status.behind > 0 &&
    status.ahead === 0 &&
    status.noteCount === 0
  ) {
    return "Updating…";
  }
  return "Pushing…";
}

export function gitSuccessLabel(
  result: GitPublishResult,
  host: GitHostKind,
): string {
  if (result.kind === "error") {
    return gitReasonCopy(result.reason);
  }
  if (result.kind === "kept_both") {
    const names = result.siblingPaths
      .map((path) => path.split("/").at(-1))
      .filter(Boolean);
    if (names.length === 1) {
      return `Pushed · ${names[0]} also on ${remoteLabel(host)}`;
    }
    return `Pushed · ${names.length} notes also on ${remoteLabel(host)}`;
  }
  if (result.kind === "updated") {
    return "Updated";
  }
  if (result.kind === "up_to_date") {
    return "Up to date";
  }
  return "Pushed";
}

export function gitControlLabel(input: {
  status: GitStatus;
  running: boolean;
  result: GitPublishResult | null;
}): string | null {
  if (input.status.kind !== "git") {
    return null;
  }
  if (input.running) {
    return gitBusyLabel(input.status);
  }
  if (input.result) {
    return gitSuccessLabel(input.result, input.status.host);
  }
  return gitIdleLabel(input.status);
}
