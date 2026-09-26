import fs from "node:fs";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { initRepo, makeTempDir } from "./git-fixture";
import { GitTrust } from "./trust";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});
it("gates every operation, rejects cancellation, and revokes changed metadata", async () => {
  const root = makeTempDir("copper-trust-");
  roots.push(root);
  initRepo(root);
  const trust = new GitTrust();
  const run = vi.fn(() => "executed");
  expect(trust.state(root)).toBe("untrusted");
  expect(() => trust.run(root, run)).toThrow();
  expect(run).not.toHaveBeenCalled();
  expect(await trust.request(root, async () => false)).toBe(false);
  expect(() => trust.run(root, run)).toThrow();
  expect(await trust.request(root, async () => true)).toBe(true);
  expect(trust.run(root, run)).toBe("executed");
  fs.appendFileSync(path.join(root, ".git/config"), "\n# changed\n");
  expect(() => trust.run(root, run)).toThrow();
  await trust.request(root, async () => true);
  trust.revoke(root);
  expect(() => trust.run(root, run)).toThrow();
}, 30_000);
