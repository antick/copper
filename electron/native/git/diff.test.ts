import fs from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { inspectGitDiff } from "./diff";
import { gitSetup, initRepo, makeTempDir, writeFile } from "./git-fixture";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("git diff", () => {
  it("returns a unified diff for a dirty tracked note", async () => {
    const root = makeTempDir("copper-git-diff-");
    temps.push(root);
    initRepo(root);
    writeFile(root, "Daily.md", "# One\n");
    gitSetup(root, ["add", "Daily.md"]);
    gitSetup(root, ["commit", "-m", "one"]);
    writeFile(root, "Daily.md", "# Two\n");
    const diff = await inspectGitDiff(root, "Daily.md");
    expect(diff.path).toBe("Daily.md");
    expect(diff.binary).toBe(false);
    expect(diff.text).toContain("Two");
  });

  it("rejects a path outside the Vault", async () => {
    const root = makeTempDir("copper-git-diff-escape-");
    temps.push(root);
    initRepo(root);
    await expect(inspectGitDiff(root, "../secret.md")).rejects.toThrow(
      /outside/i,
    );
  });
});
