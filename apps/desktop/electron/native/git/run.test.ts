import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { GitCommandError, runGit } from "./run";

describe("runGit", () => {
  const originalPath = process.env.PATH;

  afterEach(() => {
    process.env.PATH = originalPath;
  });

  it("maps a missing git binary to no_git_bin", async () => {
    process.env.PATH = "/tmp/copper-no-git-bin";
    await expect(runGit(os.tmpdir(), ["status"])).rejects.toEqual(
      expect.objectContaining({
        name: "GitCommandError",
        reason: "no_git_bin",
      }),
    );
    await expect(runGit(os.tmpdir(), ["status"])).rejects.toBeInstanceOf(
      GitCommandError,
    );
  });
});
