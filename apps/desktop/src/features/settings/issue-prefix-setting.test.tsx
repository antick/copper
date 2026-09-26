import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssuePrefixSetting } from "@/features/settings/issue-prefix-setting";
import { defaultSettings } from "@/lib/copper/settings";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/features/settings/settings-provider", () => ({
  useSettings: () => defaultSettings,
  useSaveSettings: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isError: false,
  }),
}));

describe("IssuePrefixSetting", () => {
  beforeEach(() => mocks.mutate.mockClear());

  it("retains invalid input and saves a valid normalized prefix", async () => {
    const user = userEvent.setup();
    render(<IssuePrefixSetting />);
    const input = screen.getByRole("textbox", {
      name: "Issue identifier prefix",
    });
    await user.clear(input);
    await user.type(input, "1");
    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Use # or 1–8");
    expect(mocks.mutate).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "#");
    fireEvent.blur(input);
    expect(screen.getByRole("status")).toHaveTextContent("Next issue: #1");
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ issueIdPrefix: "#" }),
    );

    mocks.mutate.mockClear();
    await user.clear(input);
    await user.type(input, "work2");
    fireEvent.blur(input);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ issueIdPrefix: "WORK2" }),
    );
  });
});
