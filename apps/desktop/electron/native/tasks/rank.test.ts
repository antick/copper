import { describe, expect, it } from "vitest";
import { firstRank, RANK_CHARSET, rankBetween } from "./rank";

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
});
