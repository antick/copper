import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilesSettings } from "./files";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  settings: {
    theme: "system",
    lightTheme: "linen",
    darkTheme: "graphite",
    fontFamily: "inter",
    fontSize: 14,
    lineHeight: 1.55,
    tabSize: 2,
    wrapping: true,
    attachmentFolder: "attachments",
    navigationLayout: "note-list",
    issueIdPrefix: "ISSUE",
  },
}));

vi.mock("@/features/settings/settings-provider", () => ({
  useSettings: () => mocks.settings,
  useSaveSettings: () => ({ mutate: mocks.mutate }),
}));

describe("FilesSettings", () => {
  beforeEach(() => mocks.mutate.mockClear());

  it("keeps an invalid draft local and explains the folder error", async () => {
    const user = userEvent.setup();
    render(<FilesSettings />);
    const input = screen.getByRole("textbox", { name: "Attachment folder" });

    await user.clear(input);
    await user.type(input, "../outside");
    expect(mocks.mutate).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(input).toHaveValue("../outside");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/\.\.|Vault/i);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("saves a valid nested folder with spaces when focus leaves the field", async () => {
    const user = userEvent.setup();
    render(<FilesSettings />);
    const input = screen.getByRole("textbox", { name: "Attachment folder" });

    await user.clear(input);
    await user.type(input, "Notes and Images/Raw Uploads");
    expect(mocks.mutate).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentFolder: "Notes and Images/Raw Uploads",
      }),
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps focus and reports invalid input when Enter requests a save", async () => {
    const user = userEvent.setup();
    render(<FilesSettings />);
    const input = screen.getByRole("textbox", { name: "Attachment folder" });

    await user.clear(input);
    await user.type(input, "/images");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(/relative/i);
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("saves a valid folder on Enter and describes hidden task storage accurately", async () => {
    const user = userEvent.setup();
    render(<FilesSettings />);
    const input = screen.getByRole("textbox", { name: "Attachment folder" });

    await user.clear(input);
    await user.type(input, "Notes and Images/Raw Uploads");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentFolder: "Notes and Images/Raw Uploads",
      }),
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(
      screen.getByText(/tasks and projects.*hidden workspace area/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/never creates a hidden metadata folder/i),
    ).not.toBeInTheDocument();
  });
});
