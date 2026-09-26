export const DEFAULT_ISSUE_ID_PREFIX = "ISSUE";
export const ISSUE_ID_PREFIX_PATTERN = /^(?:#|[A-Z][A-Z0-9]{0,7})$/;
const ISSUE_ID_PATTERN = /^(#(\d+)|([A-Z][A-Z0-9]{0,7})-(\d+))$/i;

export const ISSUE_COLUMN_IDS = [
  "id",
  "title",
  "status",
  "priority",
  "project",
  "labels",
  "due",
] as const;

export type IssueColumnId = (typeof ISSUE_COLUMN_IDS)[number];

export const ISSUE_COLUMN_WIDTHS: Record<IssueColumnId, number> = {
  id: 96,
  title: 320,
  status: 142,
  priority: 132,
  project: 150,
  labels: 180,
  due: 132,
};

export const ISSUE_COLUMN_MIN_WIDTH = 72;
export const ISSUE_COLUMN_MAX_WIDTH = 560;

export function normalizeIssueIdPrefix(value: unknown): string {
  const prefix = typeof value === "string" ? value.trim().toUpperCase() : "";
  return ISSUE_ID_PREFIX_PATTERN.test(prefix)
    ? prefix
    : DEFAULT_ISSUE_ID_PREFIX;
}

export function formatIssueId(prefix: string, sequence: number): string {
  const normalized = normalizeIssueIdPrefix(prefix);
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError("Issue sequence must be a positive safe integer");
  }
  return normalized === "#" ? `#${sequence}` : `${normalized}-${sequence}`;
}

export function parseIssueIdentifier(
  value: unknown,
): { prefix: string; sequence: number } | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(ISSUE_ID_PATTERN);
  if (!match) return undefined;
  const prefix = match[2] ? "#" : match[3]?.toUpperCase();
  const sequence = Number(match[2] ?? match[4]);
  return prefix && Number.isSafeInteger(sequence)
    ? { prefix, sequence }
    : undefined;
}

export function normalizeOrderedIds(
  value: unknown,
  availableIds?: readonly string[],
): string[] {
  const available = availableIds ? new Set(availableIds) : undefined;
  const ids = Array.isArray(value) ? value : [];
  const normalized = [
    ...new Set(
      ids.filter(
        (id): id is string =>
          typeof id === "string" &&
          id.length > 0 &&
          available?.has(id) !== false,
      ),
    ),
  ];
  if (availableIds) {
    for (const id of availableIds)
      if (!normalized.includes(id)) normalized.push(id);
  }
  return normalized;
}

export function normalizeIssueColumnWidths(value: unknown) {
  const widths: Partial<Record<IssueColumnId, number>> = {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    return widths;
  for (const id of ISSUE_COLUMN_IDS) {
    const width = Number((value as Record<string, unknown>)[id]);
    if (Number.isFinite(width)) {
      widths[id] = Math.min(
        ISSUE_COLUMN_MAX_WIDTH,
        Math.max(ISSUE_COLUMN_MIN_WIDTH, Math.round(width)),
      );
    }
  }
  return widths;
}
