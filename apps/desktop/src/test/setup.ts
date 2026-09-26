import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined" && !window.copperDesktop) {
  window.copperDesktop = {
    packaged: false,
    invoke: async () => {
      throw new Error("Copper desktop bridge is unavailable in tests");
    },
    on: () => () => undefined,
  };
}

if (typeof window !== "undefined") {
  window.scrollTo = () => undefined;
}

if (typeof Range !== "undefined" && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = function getClientRects() {
    return {
      item: () => null,
      length: 0,
      [Symbol.iterator]: function* iterator() {},
    } as DOMRectList;
  };
  Range.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return new DOMRect();
  };
}
