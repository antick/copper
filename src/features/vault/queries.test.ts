import { describe, expect, it } from "vitest";
import { vaultKeys } from "@/features/vault/queries";

describe("vault query keys", () => {
  it("keeps stable key factories", () => {
    expect(vaultKeys.all).toEqual(["vaults"]);
    expect(vaultKeys.detail("abc")).toEqual(["vault", "abc"]);
    expect(vaultKeys.tree("abc")).toEqual(["vault", "abc", "tree"]);
  });
});
