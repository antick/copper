export const GIT_SUCCESS_NOTICE_MS = 4_000;
export const GIT_STATUS_QUERY_KEY = "git" as const;

export const GIT_COMMIT_MESSAGE_FIELD = {
  label: "Commit message (optional)",
  hint: "Leave blank to use Copper’s default commit message.",
  placeholder: "Describe your changes",
  rows: 2,
} as const;
export const GIT_PUBLISH_ERROR_COPY =
  "Couldn’t push your Vault. Please try again.";
