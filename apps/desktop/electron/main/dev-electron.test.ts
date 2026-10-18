import { describe, expect, it } from "vitest";
import { createDevEnvironment } from "../../scripts/dev-electron.mjs";

describe("createDevEnvironment", () => {
  it("removes inherited Electron-as-Node mode without mutating the source", () => {
    const source = {
      ELECTRON_RUN_AS_NODE: "1",
      COPPER_USER_DATA_DIR: "/tmp/copper-dev-test",
      PATH: "/usr/bin",
    };

    const env = createDevEnvironment(source);

    expect(env).toEqual({
      COPPER_USER_DATA_DIR: "/tmp/copper-dev-test",
      PATH: "/usr/bin",
    });
    expect(source.ELECTRON_RUN_AS_NODE).toBe("1");
  });
});
