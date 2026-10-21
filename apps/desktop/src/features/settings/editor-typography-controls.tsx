import { useEffect, useState } from "react";
import {
  SettingsNumberField,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsStatus,
} from "@/features/settings/settings-controls";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";
import {
  EDITOR_FONT_SIZE,
  EDITOR_FONTS,
  EDITOR_LINE_HEIGHT,
  editorFont,
  isTypographyNumber,
} from "@/lib/copper/editor-typography";
import "./editor-typography.css";

export function EditorTypographyControls() {
  const settings = useSettings();
  const save = useSaveSettings();
  return (
    <SettingsSection
      title="Typography"
      description="Applies to all notes. Changes are saved automatically."
    >
      <SettingsRow
        label="Font face"
        description="Choose a reading or coding font."
        control={
          <SettingsSelect
            aria-label="Editor font face"
            value={settings.fontFamily}
            disabled={save.isPending}
            onChange={(event) =>
              save.mutate({
                ...settings,
                fontFamily: editorFont(event.target.value).id,
              })
            }
          >
            {EDITOR_FONTS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </SettingsSelect>
        }
      />
      <SettingsRow
        label="Font size"
        description="Text size in pixels."
        control={
          <TypographyNumber
            label="Editor font size"
            value={settings.fontSize}
            bounds={EDITOR_FONT_SIZE}
            disabled={save.isPending}
            onSave={(fontSize) => save.mutate({ ...settings, fontSize })}
          />
        }
      />
      <SettingsRow
        label="Line spacing"
        description="Space between lines of text."
        control={
          <TypographyNumber
            label="Editor line height"
            value={settings.lineHeight}
            bounds={EDITOR_LINE_HEIGHT}
            disabled={save.isPending}
            onSave={(lineHeight) => save.mutate({ ...settings, lineHeight })}
          />
        }
      />
      <section
        className="copper-typography-preview"
        style={{
          fontFamily: editorFont(settings.fontFamily).family,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
        }}
        aria-label="Font preview"
      >
        <p>A little room to think.</p>
        <p>Ideas, notes, and everything in between.</p>
        <p>const idea = "Make something useful";</p>
      </section>
      {save.isError ? (
        <SettingsStatus tone="error">
          Couldn’t save your editor preferences. Please try again.
        </SettingsStatus>
      ) : null}
    </SettingsSection>
  );
}

function TypographyNumber({
  label,
  value,
  bounds,
  disabled,
  onSave,
}: {
  label: string;
  value: number;
  bounds: { min: number; max: number; step: number };
  disabled: boolean;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <SettingsNumberField
      aria-label={label}
      {...bounds}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onBlur={() => {
        const next = Number(draft);
        if (draft.trim() && isTypographyNumber(next, bounds) && next !== value)
          onSave(next);
        else setDraft(String(value));
      }}
    />
  );
}
