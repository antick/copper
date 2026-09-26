import { GIT_GITHUB_HOSTNAME } from "./constants";
import type { GitHostKind } from "./types";

export function originHostKind(url: string): GitHostKind {
  const trimmed = url.trim();
  if (!trimmed) {
    return "remote";
  }
  const normalized = trimmed.startsWith("git@")
    ? trimmed.replace(/^git@([^:]+):/, "https://$1/")
    : trimmed;
  try {
    const host = new URL(normalized).hostname.replace(/^www\./, "");
    if (
      host === GIT_GITHUB_HOSTNAME ||
      host.endsWith(`.${GIT_GITHUB_HOSTNAME}`)
    ) {
      return "github";
    }
  } catch {
    if (trimmed.includes(GIT_GITHUB_HOSTNAME)) {
      return "github";
    }
  }
  return "remote";
}
