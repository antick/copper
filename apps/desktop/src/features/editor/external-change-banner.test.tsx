import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalChangeBanner } from "@/features/editor/external-change-banner";

describe("ExternalChangeBanner", () => {
  it("stays hidden until an overlapping filesystem event arrives", () => {
    render(
      <ExternalChangeBanner
        vaultId="v"
        path="note.md"
        dirty
        onReload={() => undefined}
        onKeep={() => undefined}
      />,
    );
    expect(screen.queryByText("Keep Mine")).not.toBeInTheDocument();
  });
});
