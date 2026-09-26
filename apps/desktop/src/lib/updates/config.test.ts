import { describe, expect, it } from "vitest";
import {
  UPDATE_CHECK_FOCUS_MIN_MS,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_ENDPOINT,
  UPDATE_GITHUB_REPOSITORY,
} from "@/lib/updates/config";

describe("update config", () => {
  it("points at the public installer feed", () => {
    expect(UPDATE_GITHUB_REPOSITORY).toBe("antick/copper");
    expect(UPDATE_ENDPOINT).toBe(
      "https://github.com/antick/copper/releases/latest/download/latest.json",
    );
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(120_000);
    expect(UPDATE_CHECK_FOCUS_MIN_MS).toBe(60_000);
  });
});
