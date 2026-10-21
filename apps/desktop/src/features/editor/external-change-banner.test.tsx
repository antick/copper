import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ExternalChangeBanner } from "./external-change-banner";

it("stays hidden until a conflicting version is detected", () => {
  render(
    <ExternalChangeBanner
      visible={false}
      onReload={async () => undefined}
      onKeep={async () => undefined}
    />,
  );
  expect(screen.queryByRole("button", { name: "Keep Mine" })).toBeNull();
});
it("keeps the conflict visible and reports failed resolution", async () => {
  const keep = vi.fn().mockRejectedValue(new Error("Disk full"));
  render(
    <ExternalChangeBanner
      visible
      onReload={async () => undefined}
      onKeep={keep}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Keep Mine" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Disk full");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Keep Mine" })).toBeEnabled(),
  );
});
