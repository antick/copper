type RankedIssue = { rank: string; id: string };

function compareKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Match the binary ordering used by rank allocation and SQLite. */
export function compareTaskOrder(left: RankedIssue, right: RankedIssue) {
  return compareKeys(left.rank, right.rank) || compareKeys(left.id, right.id);
}

export function issueInsertionIndex(
  column: RankedIssue[],
  input: { beforeId?: string | null; afterId?: string | null },
) {
  const before = column.findIndex((issue) => issue.id === input.beforeId);
  const after = column.findIndex((issue) => issue.id === input.afterId);
  return before >= 0 ? before : after >= 0 ? after + 1 : column.length;
}

export const RANK_CHARSET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const MIDDLE_DIGIT = RANK_CHARSET[Math.floor(RANK_CHARSET.length / 2)];

export class RankSpaceError extends Error {}

function digitIndex(character: string): number {
  const index = RANK_CHARSET.indexOf(character);
  if (index < 0) {
    throw new Error(`Invalid rank character: ${character}`);
  }
  return index;
}

/**
 * Return a lexicographic key strictly between `left` and `right`.
 * Omit a bound to allocate before the first or after the last neighbor.
 */
export function rankBetween(
  left: string | undefined,
  right: string | undefined,
): string {
  if (left !== undefined && left.length === 0) {
    throw new Error("left rank must be non-empty");
  }
  if (right !== undefined && right.length === 0) {
    throw new Error("right rank must be non-empty");
  }
  if (left !== undefined && right !== undefined && left >= right) {
    throw new RankSpaceError("left rank must be less than right rank");
  }

  let result = "";
  let position = 0;
  for (;;) {
    const leftIndex =
      left !== undefined && position < left.length
        ? digitIndex(left[position] as string)
        : -1;
    const rightIndex =
      right !== undefined && position < right.length
        ? digitIndex(right[position] as string)
        : RANK_CHARSET.length;
    const mid = Math.floor((leftIndex + rightIndex) / 2);
    if (mid > leftIndex && mid < rightIndex) {
      // A terminal zero leaves no room for a later insertion before this key.
      const next = result + RANK_CHARSET[mid] + (mid === 0 ? MIDDLE_DIGIT : "");
      if (left !== undefined && next <= left) {
        throw new RankSpaceError("rank collision with left neighbor");
      }
      if (right !== undefined && next >= right) {
        throw new RankSpaceError("rank collision with right neighbor");
      }
      return next;
    }
    const take = leftIndex >= 0 ? leftIndex : 0;
    result += RANK_CHARSET[take] as string;
    if (right !== undefined && result >= right) {
      throw new RankSpaceError("No rank is available before right neighbor");
    }
    // Once this prefix is below the upper bound, its suffix is unrestricted.
    if (leftIndex >= 0 && leftIndex < rightIndex) right = undefined;
    position += 1;
  }
}

export function firstRank(): string {
  return rankBetween(undefined, undefined);
}

export function insertionRank(column: RankedIssue[], index: number) {
  try {
    return {
      rank: rankBetween(column[index - 1]?.rank, column[index]?.rank),
      repairs: [] as RankedIssue[],
    };
  } catch (error) {
    if (!(error instanceof RankSpaceError)) throw error;
    // Old versions could persist terminal zeroes or duplicate neighboring keys.
    let previous: string | undefined;
    const repairs = column.map(({ id }) => {
      previous = rankBetween(previous, undefined);
      return { id, rank: previous };
    });
    return {
      rank: rankBetween(repairs[index - 1]?.rank, repairs[index]?.rank),
      repairs,
    };
  }
}
