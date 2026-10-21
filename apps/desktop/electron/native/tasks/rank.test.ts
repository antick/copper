import { describe, expect, it } from "vitest";
import {
  firstRank,
  RANK_CHARSET,
  rankBetween,
} from "../../../shared/task-order";

describe("rankBetween", () => {
  it("allocates a first key in the charset", () => {
    const rank = firstRank();
    expect(rank.length).toBeGreaterThan(0);
    expect([...rank].every((ch) => RANK_CHARSET.includes(ch))).toBe(true);
  });

  it("places a key between two neighbors", () => {
    const left = "A";
    const right = "C";
    const mid = rankBetween(left, right);
    expect(mid > left).toBe(true);
    expect(mid < right).toBe(true);
  });

  it("places a key after the last neighbor", () => {
    const last = firstRank();
    const next = rankBetween(last, undefined);
    expect(next > last).toBe(true);
  });

  it("places a key before the first neighbor", () => {
    const first = firstRank();
    const prev = rankBetween(undefined, first);
    expect(prev < first).toBe(true);
  });

  it("avoids colliding when neighbors are adjacent", () => {
    const left = "A";
    const right = "B";
    const mid = rankBetween(left, right);
    expect(mid).not.toBe(left);
    expect(mid).not.toBe(right);
    expect(mid > left && mid < right).toBe(true);
  });

  it("rejects equal or inverted bounds", () => {
    expect(() => rankBetween("M", "M")).toThrow();
    expect(() => rankBetween("Z", "A")).toThrow();
  });

  it("supports repeated insertions before the first card", () => {
    let right = firstRank();
    for (let move = 0; move < 1000; move += 1) {
      const rank = rankBetween(undefined, right);
      expect(rank < right).toBe(true);
      right = rank;
    }
  });

  it("allocates between adjacent prefixes with different suffixes", () => {
    const rank = rankBetween("Az", "B1");
    expect(rank > "Az" && rank < "B1").toBe(true);
  });

  it("supports repeated insertions after the last card", () => {
    let left = firstRank();
    for (let move = 0; move < 1000; move += 1) {
      const rank = rankBetween(left, undefined);
      expect(rank > left).toBe(true);
      left = rank;
    }
  });

  it("keeps every key strictly ordered after dense insertions", () => {
    const ranks: string[] = [];
    for (let move = 0; move < 1000; move += 1) {
      const index = (move * 17) % (ranks.length + 1);
      const rank = rankBetween(ranks[index - 1], ranks[index]);
      if (index > 0) expect(rank > ranks[index - 1]).toBe(true);
      if (index < ranks.length) expect(rank < ranks[index]).toBe(true);
      ranks.splice(index, 0, rank);
    }
    expect(new Set(ranks).size).toBe(1000);
  });
});
