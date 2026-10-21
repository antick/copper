import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorPane } from "@/components/shell/editor-pane";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/features/settings/settings-provider";
import { type CopperSettings, defaultSettings } from "@/lib/copper/settings";
import { EditorSettings } from "@/routes/settings/editor";

const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/copper", () => ({ copper: { settings: mocks } }));

let persisted: CopperSettings;
beforeEach(() => {
  persisted = { ...defaultSettings };
  mocks.load.mockReset().mockImplementation(async () => persisted);
  mocks.save
    .mockReset()
    .mockImplementation(async (settings: CopperSettings) => {
      persisted = settings;
    });
});

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SettingsProvider>
          <EditorSettings />
          <EditorPane path="note.md" fileKind="markdown">
            <p>Note content</p>
          </EditorPane>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("Note typography", () => {
  it("saves a typed size when the note settings dialog closes with Escape", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      await screen.findByRole("button", { name: "More file actions" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Editor settings…" }),
    );
    const dialog = within(await screen.findByRole("dialog"));
    const size = dialog.getByRole("spinbutton", { name: "Editor font size" });
    await user.clear(size);
    await user.type(size, "20");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(persisted.fontSize).toBe(20));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shares saved preferences between Settings and the note menu, returning focus on close", async () => {
    const user = userEvent.setup();
    mount();
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Editor font face" }),
      "lora",
    );
    await waitFor(() => expect(persisted.fontFamily).toBe("lora"));
    expect(
      document.documentElement.style.getPropertyValue("--editor-font-family"),
    ).toContain("Lora Variable");
    const trigger = screen.getByRole("button", { name: "More file actions" });
    await user.click(trigger);
    await user.click(
      screen.getByRole("menuitem", { name: "Editor settings…" }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "Note appearance" }),
    );
    expect(
      dialog.getByRole("combobox", { name: "Editor font face" }),
    ).toHaveValue("lora");
    const size = dialog.getByRole("spinbutton", { name: "Editor font size" });
    await user.clear(size);
    await user.type(size, "24");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(persisted.fontSize).toBe(24));
    expect(
      document.documentElement.style.getPropertyValue("--editor-font-size"),
    ).toBe("24px");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(
      screen.getByRole("spinbutton", { name: "Editor font size" }),
    ).toHaveValue(24);
    expect(screen.getByText("Note content")).toBeVisible();
  });

  it("keeps font face and spacing after the settings provider mounts again", async () => {
    const user = userEvent.setup();
    const first = mount();
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Editor font face" }),
      "jetbrains-mono",
    );
    await waitFor(() => expect(persisted.fontFamily).toBe("jetbrains-mono"));
    const spacing = screen.getByRole("spinbutton", {
      name: "Editor line height",
    });
    await user.clear(spacing);
    await user.type(spacing, "1.8");
    await user.tab();
    await waitFor(() => expect(persisted.lineHeight).toBe(1.8));
    first.unmount();
    mount();
    expect(
      await screen.findByRole("combobox", { name: "Editor font face" }),
    ).toHaveValue("jetbrains-mono");
    expect(
      screen.getByRole("spinbutton", { name: "Editor line height" }),
    ).toHaveValue(1.8);
  });

  it("restores saved values after empty or out-of-range input without saving them", async () => {
    const user = userEvent.setup();
    mount();
    const size = await screen.findByRole("spinbutton", {
      name: "Editor font size",
    });
    await user.clear(size);
    await user.tab();
    expect(size).toHaveValue(defaultSettings.fontSize);
    await user.clear(size);
    await user.type(size, "99");
    await user.tab();
    expect(size).toHaveValue(defaultSettings.fontSize);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("shows a save failure, rolls back the appearance, and allows another attempt", async () => {
    const user = userEvent.setup();
    mocks.save.mockRejectedValueOnce(new Error("disk full"));
    mount();
    const face = await screen.findByRole("combobox", {
      name: "Editor font face",
    });
    await user.selectOptions(face, "lora");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t save");
    await waitFor(() => expect(face).toHaveValue("inter"));
    await user.selectOptions(face, "lora");
    await waitFor(() => expect(persisted.fontFamily).toBe("lora"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
