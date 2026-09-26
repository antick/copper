import { expect, it } from "vitest";
import { validateInvocation } from "../../src/lib/copper/command-contract";
import {
  contentSecurityPolicy,
  rendererLocation,
  trustedRendererUrl,
} from "./security-policy";

it("only trusts the configured renderer location", () => {
  const expected = rendererLocation("/app/out/main");
  expect(trustedRendererUrl(`${expected}#/vault/test`, expected)).toBe(true);
  for (const url of [
    "https://evil.test",
    "file:///tmp/evil.html",
    `${expected}?evil=1`,
  ])
    expect(trustedRendererUrl(url, expected)).toBe(false);
  expect(
    trustedRendererUrl(
      "http://localhost:1420.evil.test/",
      "http://localhost:1420/",
    ),
  ).toBe(false);
  expect(() => rendererLocation("/app", "https://evil.test")).toThrow();
});
it("rejects forged paths, malformed payloads and unknown commands", () => {
  expect(() =>
    validateInvocation("load_session", { vaultId: "../../elsewhere" }),
  ).toThrow();
  expect(() =>
    validateInvocation("open_vault", { path: {}, trusted: true }),
  ).toThrow();
  expect(() => validateInvocation("__proto__", {})).toThrow();
  expect(() =>
    validateInvocation("install_update", { unexpected: true }),
  ).toThrow();
  expect(
    validateInvocation("read_file", {
      vaultId: "a".repeat(64),
      path: "note.md",
    }),
  ).toEqual({ vaultId: "a".repeat(64), path: "note.md" });
});
it("keeps production connections and remote scripts disabled", () => {
  const policy = contentSecurityPolicy();
  expect(policy).toContain("connect-src 'none'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain("unsafe-eval");
});
