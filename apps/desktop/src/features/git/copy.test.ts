import { describe, expect, it } from "vitest";
import {
  gitControlLabel,
  gitIdleLabel,
  gitReasonCopy,
  gitSuccessLabel,
} from "@/features/git/copy";
import type { GitStatus } from "@/lib/copper/git";

const git = (
  partial: Partial<Extract<GitStatus, { kind: "git" }>>,
): GitStatus => ({
  kind: "git",
  branch: "main",
  host: "github",
  dirtyCount: 0,
  ahead: 0,
  behind: 0,
  noteCount: 0,
  paths: [],
  blockReason: null,
  ...partial,
});

describe("git copy", () => {
  it("hides chrome when the Vault is not Git", () => {
    expect(gitIdleLabel({ kind: "not_git" })).toBeNull();
    expect(
      gitControlLabel({
        status: { kind: "not_git" },
        running: false,
        result: null,
      }),
    ).toBeNull();
  });

  it("labels push, update, and up to date", () => {
    expect(gitIdleLabel(git({ noteCount: 3 }))).toBe("Push 3 notes");
    expect(gitIdleLabel(git({ noteCount: 1 }))).toBe("Push 1 note");
    expect(gitIdleLabel(git({ behind: 2 }))).toBe("Update from GitHub");
    expect(gitIdleLabel(git({ host: "remote", behind: 1 }))).toBe(
      "Update from remote",
    );
    expect(gitIdleLabel(git({}))).toBe("Up to date");
  });

  it("maps blocking reasons and keep-both success", () => {
    expect(gitReasonCopy("no_remote")).toBe(
      "This folder has Git, but no remote",
    );
    expect(
      gitSuccessLabel(
        {
          kind: "kept_both",
          changedPaths: ["Daily.md"],
          siblingPaths: ["Daily (from GitHub).md"],
        },
        "github",
      ),
    ).toBe("Pushed · Daily (from GitHub).md also on GitHub");
  });
});
