import { describe, expect, it } from "vitest";
import { originHostKind } from "./host";

describe("originHostKind", () => {
  it("detects GitHub HTTPS and SSH remotes", () => {
    expect(originHostKind("https://github.com/user/notes.git")).toBe("github");
    expect(originHostKind("git@github.com:user/notes.git")).toBe("github");
  });

  it("treats other hosts as remote", () => {
    expect(originHostKind("/tmp/bare.git")).toBe("remote");
    expect(originHostKind("https://gitlab.com/user/notes.git")).toBe("remote");
  });
});
