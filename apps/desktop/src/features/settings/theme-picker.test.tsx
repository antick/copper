import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  type AppearanceMode,
  AppearanceModePicker,
  ThemeGallery,
} from "@/features/settings/theme-picker";
import {
  type ColorThemeId,
  DARK_THEMES,
  LIGHT_THEMES,
} from "@/lib/copper/themes";

function GalleryHarness() {
  const [mode, setMode] = useState<AppearanceMode>("system");
  const [lightTheme, setLightTheme] = useState<ColorThemeId>("linen");
  const [darkTheme, setDarkTheme] = useState<ColorThemeId>("graphite");
  return (
    <>
      <AppearanceModePicker value={mode} onChange={setMode} />
      <ThemeGallery
        label="Light themes"
        themes={LIGHT_THEMES}
        selected={lightTheme}
        effective="linen"
        onChange={setLightTheme}
      />
      <ThemeGallery
        label="Dark themes"
        themes={DARK_THEMES}
        selected={darkTheme}
        effective="linen"
        onChange={setDarkTheme}
      />
    </>
  );
}

describe("theme picker", () => {
  it("renders accessible mode and seven-theme radio groups", () => {
    render(<GalleryHarness />);

    expect(
      screen.getByRole("group", { name: "Appearance mode" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Light themes" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Dark themes" })).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(17);
    expect(screen.getByRole("radio", { name: /Linen/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Graphite/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Aurora/ })).toBeInTheDocument();
    expect(screen.getByText("Currently active")).toBeVisible();
  });

  it("supports pointer, Space, and Enter selection without crossing groups", async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();

    const dawn = screen.getByRole("radio", { name: /Dawn/ });
    dawn.focus();
    await user.keyboard(" ");
    expect(dawn).toBeChecked();
    expect(screen.getByRole("radio", { name: /Graphite/ })).toBeChecked();

    const nord = screen.getByRole("radio", { name: /Nord/ });
    nord.focus();
    await user.keyboard("{Enter}");
    expect(nord).toBeChecked();
    expect(dawn).toBeChecked();
  });
});
