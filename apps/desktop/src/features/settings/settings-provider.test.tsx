import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusBar } from "@/components/shell/status-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  applySettings,
  SettingsProvider,
  useEffectiveColorTheme,
  useEffectiveTheme,
  useSettings,
} from "@/features/settings/settings-provider";
import { defaultSettings } from "@/lib/copper/settings";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/lib/copper", () => ({
  copper: {
    settings: {
      load: mocks.load,
      save: mocks.save,
    },
    git: {
      status: async () => ({ kind: "not_git" }),
      publish: async () => ({
        kind: "error",
        reason: "not_git",
        changedPaths: [],
        siblingPaths: [],
      }),
    },
  },
}));

class MatchMediaHarness {
  matches: boolean;
  readonly media = "(prefers-color-scheme: dark)";
  readonly listeners = new Set<(event: MediaQueryListEvent) => void>();
  addEventListener = vi.fn(
    (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      this.listeners.add(listener);
    },
  );
  removeEventListener = vi.fn(
    (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      this.listeners.delete(listener);
    },
  );

  constructor(matches: boolean) {
    this.matches = matches;
  }

  setMatches(matches: boolean) {
    this.matches = matches;
    const event = { matches, media: this.media } as MediaQueryListEvent;
    for (const listener of this.listeners) listener(event);
  }
}

function installMatchMedia(matches: boolean) {
  const harness = new MatchMediaHarness(matches);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => harness),
  });
  return harness;
}

function ThemeProbe() {
  const settings = useSettings();
  const effectiveTheme = useEffectiveTheme();
  const effectiveColorTheme = useEffectiveColorTheme();
  return (
    <p>
      <span data-testid="preference">{settings.theme}</span>
      <span data-testid="effective-theme">{effectiveTheme}</span>
      <span data-testid="effective-color-theme">{effectiveColorTheme}</span>
    </p>
  );
}

function renderProvider(child = <ThemeProbe />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SettingsProvider>{child}</SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("settings theme resolution", () => {
  beforeEach(() => {
    mocks.load.mockReset();
    mocks.save.mockReset();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-color-theme");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-color-theme");
    vi.restoreAllMocks();
  });

  it("applies explicit and resolved System theme tokens", () => {
    applySettings({ ...defaultSettings, theme: "dark", fontSize: 16 }, false);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute(
      "data-color-theme",
      "graphite",
    );
    expect(
      document.documentElement.style.getPropertyValue("--editor-font-size"),
    ).toBe("16px");
    expect(document.documentElement).not.toHaveAttribute(
      "data-window-translucent",
    );

    applySettings(
      { ...defaultSettings, theme: "dark", darkTheme: "aurora" },
      false,
    );
    expect(document.documentElement).toHaveAttribute(
      "data-color-theme",
      "aurora",
    );

    applySettings(
      { ...defaultSettings, theme: "system", lightTheme: "dawn" },
      false,
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).toHaveAttribute(
      "data-color-theme",
      "dawn",
    );
    applySettings(
      { ...defaultSettings, theme: "system", darkTheme: "nord" },
      true,
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute(
      "data-color-theme",
      "nord",
    );
  });

  it("follows live system changes without replacing palettes or the System preference", async () => {
    const media = installMatchMedia(false);
    mocks.load.mockResolvedValue({
      ...defaultSettings,
      theme: "system",
      lightTheme: "dawn",
      darkTheme: "midnight",
    });
    renderProvider();

    expect(await screen.findByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("light");
    expect(screen.getByTestId("effective-color-theme")).toHaveTextContent(
      "dawn",
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    act(() => media.setMatches(true));
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("effective-color-theme")).toHaveTextContent(
      "midnight",
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    act(() => media.setMatches(false));
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("light");
    expect(screen.getByTestId("effective-color-theme")).toHaveTextContent(
      "dawn",
    );
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("removes the system listener during provider cleanup", async () => {
    const media = installMatchMedia(false);
    mocks.load.mockResolvedValue({ ...defaultSettings, theme: "system" });
    const view = renderProvider();

    await screen.findByTestId("preference");
    expect(media.listeners.size).toBe(1);
    view.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(media.listeners.size).toBe(0);
  });

  it.each(["light", "dark"] as const)(
    "preserves an explicit %s override when the system changes",
    async (theme) => {
      const media = installMatchMedia(theme === "light");
      mocks.load.mockResolvedValue({ ...defaultSettings, theme });
      renderProvider();

      expect(await screen.findByTestId("preference")).toHaveTextContent(theme);
      expect(screen.getByTestId("effective-theme")).toHaveTextContent(theme);
      act(() => media.setMatches(theme !== "light"));
      expect(screen.getByTestId("effective-theme")).toHaveTextContent(theme);
      expect(document.documentElement).toHaveAttribute("data-theme", theme);
    },
  );

  it("shows the effective system theme in shell chrome without losing palettes", async () => {
    const user = userEvent.setup();
    installMatchMedia(true);
    mocks.load.mockResolvedValue({
      ...defaultSettings,
      theme: "system",
      lightTheme: "porcelain",
      darkTheme: "rose-pine",
    });
    const { container } = renderProvider(<StatusBar />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Toggle theme" }),
      ).toBeVisible(),
    );
    expect(container.querySelector(".lucide-sun")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute(
      "data-color-theme",
      "rose-pine",
    );

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: "light",
        lightTheme: "porcelain",
        darkTheme: "rose-pine",
      }),
    );
  });
});
