import { describe, expect, it, vi } from "vitest";
import { APP_IDENTITIES } from "../app-identity.mjs";
import { getAppIdentity, userDataPath } from "./identity";

vi.mock("electron", () => ({ app: { isPackaged: false } }));

describe("app identity", () => {
  it("keeps the packaged app on the existing Copper identity", () => {
    expect(getAppIdentity(true)).toBe(APP_IDENTITIES.production);
    expect(
      userDataPath("/user/app-data", undefined, APP_IDENTITIES.production),
    ).toBe("/user/app-data/app.copper.desktop");
  });

  it("isolates development identity and data from the packaged app", () => {
    expect(getAppIdentity(false)).toBe(APP_IDENTITIES.development);
    expect(
      userDataPath("/user/app-data", undefined, APP_IDENTITIES.development),
    ).toBe("/user/app-data/app.copper.desktop.dev");
  });

  it("preserves the explicit test data-directory override", () => {
    expect(
      userDataPath(
        "/user/app-data",
        "/tmp/copper-test-data",
        APP_IDENTITIES.development,
      ),
    ).toBe("/tmp/copper-test-data");
  });
});
