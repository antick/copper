import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GitDiffView } from "@/features/git/git-diff-view";

describe("GitDiffView", () => {
  it("colors added and removed lines", () => {
    render(
      <GitDiffView
        text={"--- a/a.md\n+++ b/a.md\n@@ -1 +1 @@\n-old\n+new\n"}
      />,
    );
    expect(screen.getByText("-old")).toHaveAttribute("data-kind", "del");
    expect(screen.getByText("+new")).toHaveAttribute("data-kind", "add");
  });
});
