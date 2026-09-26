export type GitHostKind = "github" | "remote";

export type GitBlockReason =
  | "not_git"
  | "no_git_bin"
  | "no_remote"
  | "no_identity"
  | "merging"
  | "detached"
  | "rebase"
  | "cherry_pick"
  | "revert";

export type GitFailReason =
  | GitBlockReason
  | "auth"
  | "timeout"
  | "io"
  | "combine_failed";

export type GitStatus =
  | { kind: "not_git" }
  | { kind: "untrusted" }
  | {
      kind: "git";
      branch: string | null;
      host: GitHostKind;
      dirtyCount: number;
      ahead: number;
      behind: number;
      noteCount: number;
      paths: string[];
      blockReason: GitBlockReason | null;
    };

export type GitDiff = {
  path: string;
  text: string | null;
  binary: boolean;
};

export type GitPublishResult =
  | {
      kind: "pushed" | "updated" | "up_to_date" | "kept_both";
      changedPaths: string[];
      siblingPaths: string[];
    }
  | {
      kind: "error";
      reason: GitFailReason;
      changedPaths: string[];
      siblingPaths: string[];
    };

export type GitRunResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export type GitRunner = (
  root: string,
  args: string[],
  options?: { allowFailure?: boolean; binary?: boolean },
) => Promise<GitRunResult & { stdoutBuffer?: Buffer }>;
