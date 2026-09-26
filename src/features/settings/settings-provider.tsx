import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { copper } from "@/lib/copper";
import {
  type CopperSettings,
  defaultSettings,
  normalizeSettings,
} from "@/lib/copper/settings";
import { type ColorThemeId, DEFAULT_LIGHT_THEME } from "@/lib/copper/themes";

export type EffectiveTheme = "light" | "dark";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";
const SettingsContext = createContext<CopperSettings>(defaultSettings);
const EffectiveThemeContext = createContext<EffectiveTheme>("light");
const EffectiveColorThemeContext =
  createContext<ColorThemeId>(DEFAULT_LIGHT_THEME);

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(SYSTEM_DARK_QUERY).matches
  );
}

export function resolveEffectiveTheme(
  theme: CopperSettings["theme"],
  systemDark: boolean,
): EffectiveTheme {
  if (theme === "system") {
    return systemDark ? "dark" : "light";
  }
  return theme;
}

export function resolveEffectiveColorTheme(
  settings: CopperSettings,
  effectiveTheme: EffectiveTheme,
): ColorThemeId {
  return effectiveTheme === "dark" ? settings.darkTheme : settings.lightTheme;
}

export function applySettings(
  settings: CopperSettings,
  systemDark = systemPrefersDark(),
) {
  const root = document.documentElement;
  const effectiveTheme = resolveEffectiveTheme(settings.theme, systemDark);
  const effectiveColorTheme = resolveEffectiveColorTheme(
    settings,
    effectiveTheme,
  );
  root.setAttribute("data-theme", effectiveTheme);
  root.setAttribute("data-color-theme", effectiveColorTheme);
  root.style.setProperty("--editor-font-size", `${settings.fontSize}px`);
  root.style.setProperty("--editor-line-height", String(settings.lineHeight));
  return { effectiveTheme, effectiveColorTheme };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => copper.settings.load(),
  });
  // Older app-data files do not contain navigationLayout. Keep the provider
  // total while the repository migrates those records to the new default.
  const settings = query.data ? normalizeSettings(query.data) : defaultSettings;
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const effectiveTheme = resolveEffectiveTheme(settings.theme, systemDark);
  const effectiveColorTheme = resolveEffectiveColorTheme(
    settings,
    effectiveTheme,
  );

  useEffect(() => {
    if (
      settings.theme !== "system" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const syncTheme = () => setSystemDark(media.matches);
    syncTheme();
    media.addEventListener("change", syncTheme);
    return () => media.removeEventListener("change", syncTheme);
  }, [settings.theme]);

  useEffect(() => {
    applySettings(settings, systemDark);
  }, [settings, systemDark]);

  if (query.isPending) {
    return (
      <main className="copper-app-loading" role="status">
        Opening Copper…
      </main>
    );
  }

  return (
    <SettingsContext.Provider value={settings}>
      <EffectiveThemeContext.Provider value={effectiveTheme}>
        <EffectiveColorThemeContext.Provider value={effectiveColorTheme}>
          {children}
        </EffectiveColorThemeContext.Provider>
      </EffectiveThemeContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useEffectiveTheme() {
  return useContext(EffectiveThemeContext);
}

export function useEffectiveColorTheme() {
  return useContext(EffectiveColorThemeContext);
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: CopperSettings) => copper.settings.save(settings),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: ["settings"] });
      const previous = queryClient.getQueryData<CopperSettings>(["settings"]);
      queryClient.setQueryData(["settings"], normalizeSettings(settings));
      return { previous };
    },
    onError: (_error, _settings, context) => {
      queryClient.setQueryData(["settings"], context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
