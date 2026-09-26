import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeWatchPath } from "./watcher";

describe("watcher", () => {
  it("normalizes create events relative to the vault", () => {
    const root = path.join("/tmp", "vault");
    expect(
      normalizeWatchPath(root, path.join(root, "notes/a.md"), "created"),
    ).toEqual({ type: "created", path: "notes/a.md" });
  });

  it("ignores hidden atomic save files", () => {
    const root = path.join("/tmp", "vault");
    expect(
      normalizeWatchPath(
        root,
        path.join(root, "notes/.a.md.copper-tmp"),
        "created",
      ),
    ).toBeUndefined();
  });
});
