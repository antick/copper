import {
  DEFAULT_ISSUE_ID_PREFIX,
  formatIssueId,
  normalizeIssueIdPrefix,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import { discoverTaskIdentities, parseIssueId } from "./task-discovery";

export { parseIssueId, slugifyTitle } from "./task-discovery";

export function nextIssueId(prefix: string, ids: Iterable<string>): string {
  const normalizedPrefix = normalizeIssueIdPrefix(prefix);
  let max = 0;
  for (const id of ids) {
    const parsed = parseIssueIdentifier(id);
    if (parsed?.prefix === normalizedPrefix && parsed.sequence > max)
      max = parsed.sequence;
  }
  return formatIssueId(normalizedPrefix, max + 1);
}

/** Scan indexable Vault files directly. A stale SQLite index is not consulted. */
export function scanIssueIds(vaultRoot: string): string[] {
  const ids = new Set<string>();
  for (const task of discoverTaskIdentities(vaultRoot)) {
    if (task.kind !== "issue") continue;
    const fromName = parseIssueId(task.relative.split("/").at(-1) ?? "");
    if (fromName) ids.add(fromName);
    const fromIdentity = parseIssueId(task.id) ?? task.id.trim();
    if (fromIdentity) ids.add(fromIdentity);
  }
  return [...ids];
}

export function allocateIssueId(
  vaultRoot: string,
  prefix = DEFAULT_ISSUE_ID_PREFIX,
): string {
  return nextIssueId(prefix, scanIssueIds(vaultRoot));
}
