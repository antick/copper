import { type ComponentProps, lazy, Suspense, useMemo, useState } from "react";
import { useEffectiveTheme } from "@/features/settings/settings-provider";
import {
  explicitProjectIcon,
  PROJECT_ICONS,
  ProjectIcon,
} from "@/features/tasks/project-icons";

const EmojiPicker = lazy(() =>
  import("emoji-picker-react").then(({ default: Picker, Theme }) => ({
    default: ({
      dark,
      ...props
    }: ComponentProps<typeof Picker> & { dark: boolean }) => (
      <Picker {...props} theme={dark ? Theme.DARK : Theme.LIGHT} />
    ),
  })),
);

export function ProjectIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<"symbols" | "emoji">(
    value.startsWith("emoji:") ? "emoji" : "symbols",
  );
  const [query, setQuery] = useState("");
  const theme = useEffectiveTheme();
  const symbols = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? PROJECT_ICONS.filter((option) =>
          `${option.label} ${option.id}`.toLowerCase().includes(normalized),
        )
      : PROJECT_ICONS;
  }, [query]);

  return (
    <div className="copper-project-icon-picker">
      <div className="copper-project-icon-picker-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "symbols"}
          onClick={() => setMode("symbols")}
        >
          Symbols
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "emoji"}
          onClick={() => setMode("emoji")}
        >
          Emoji
        </button>
      </div>
      {mode === "symbols" ? (
        <>
          <input
            autoFocus
            type="search"
            aria-label="Search project icons"
            placeholder="Search symbols…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div
            className="copper-project-icon-grid"
            role="radiogroup"
            aria-label="Project icon"
          >
            {symbols.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={value === explicitProjectIcon(option.id)}
                aria-label={option.label}
                title={option.label}
                data-selected={value === explicitProjectIcon(option.id)}
                onClick={() => onChange(explicitProjectIcon(option.id))}
              >
                <ProjectIcon name={option.id} size={18} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <Suspense fallback={<p className="copper-empty">Loading emoji…</p>}>
          <EmojiPicker
            dark={theme === "dark"}
            width="100%"
            height={320}
            previewConfig={{ showPreview: false }}
            onEmojiClick={({ emoji }) => onChange(`emoji:${emoji}`)}
          />
        </Suspense>
      )}
    </div>
  );
}
