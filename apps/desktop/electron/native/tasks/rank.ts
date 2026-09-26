export const RANK_CHARSET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const MAX_RANK_DEPTH = 80;

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
    throw new Error("left rank must be less than right rank");
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
      const next = result + (RANK_CHARSET[mid] as string);
      if (left !== undefined && next <= left) {
        throw new Error("rank collision with left neighbor");
      }
      if (right !== undefined && next >= right) {
        throw new Error("rank collision with right neighbor");
      }
      return next;
    }
    const take = leftIndex >= 0 ? leftIndex : 0;
    result += RANK_CHARSET[take] as string;
    position += 1;
    if (position > MAX_RANK_DEPTH) {
      throw new Error("Could not allocate rank");
    }
  }
}

export function firstRank(): string {
  return rankBetween(undefined, undefined);
}
