import { describe, expect, it } from "vitest";
import {
  HEADER_HEIGHT,
  TRAFFIC_LIGHT_BUTTON_HEIGHT,
  TRAFFIC_LIGHT_X,
  TRAFFIC_LIGHT_Y,
} from "./constants";

describe("window chrome", () => {
  it("centers default traffic lights in the 42px header", () => {
    expect(HEADER_HEIGHT).toBe(42);
    expect(TRAFFIC_LIGHT_X).toBe(16);
    expect(TRAFFIC_LIGHT_BUTTON_HEIGHT).toBe(14);
    expect(TRAFFIC_LIGHT_Y).toBe(14);
  });
});
