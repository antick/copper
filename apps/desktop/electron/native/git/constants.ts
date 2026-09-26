export const GIT_BIN = "git";
export const GIT_SPAWN_TIMEOUT_MS = 60_000;
export const GIT_HOOKS_PATH = "/dev/null";
export const GIT_TERMINAL_PROMPT = "0";
export const GIT_COPPER_TEMP_EXCLUDES = [
  ":(exclude,glob)**/*.copper-tmp",
  ":(exclude,glob)**/.*.copper-tmp",
] as const;
export const GIT_SIDECAR_SUFFIX_GITHUB = "from GitHub";
export const GIT_SIDECAR_SUFFIX_REMOTE = "from remote";
export const GIT_GITHUB_HOSTNAME = "github.com";
export const GIT_COMMIT_MESSAGE_TEMPLATE = "Copper: {count} files updated";
export const GIT_MERGE_MESSAGE = "Copper: combine remote notes";
export const GIT_ORIGIN = "origin";
export const GIT_DIFF_MAX_BYTES = 200_000;
export const GIT_FORCE_FLAGS = ["--force", "--force-with-lease", "-f"] as const;

export function gitCommitMessage(count: number): string {
  return GIT_COMMIT_MESSAGE_TEMPLATE.replace("{count}", String(count));
}
