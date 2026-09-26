import { useEffect, useId, useState } from "react";
import {
  SettingsRow,
  SettingsStatus,
  SettingsTextField,
} from "@/features/settings/settings-controls";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";
import {
  formatIssueId,
  ISSUE_ID_PREFIX_PATTERN,
} from "@/lib/copper/task-settings";

export function IssuePrefixSetting() {
  const settings = useSettings();
  const save = useSaveSettings();
  const messageId = useId();
  const [value, setValue] = useState(settings.issueIdPrefix);
  useEffect(() => setValue(settings.issueIdPrefix), [settings.issueIdPrefix]);
  const valid = ISSUE_ID_PREFIX_PATTERN.test(value);
  function commit() {
    if (valid && value !== settings.issueIdPrefix)
      save.mutate({ ...settings, issueIdPrefix: value });
  }
  return (
    <SettingsRow
      label="Issue identifier"
      description="Used for new issues only. Existing identifiers and files stay unchanged."
      control={
        <div className="copper-settings-inline-control">
          <SettingsTextField
            aria-label="Issue identifier prefix"
            aria-describedby={messageId}
            aria-invalid={!valid}
            value={value}
            maxLength={8}
            onChange={(event) =>
              setValue(event.target.value.toUpperCase().replace(/\s/g, ""))
            }
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <SettingsStatus
            id={messageId}
            tone={!valid || save.isError ? "error" : "default"}
          >
            {!valid
              ? "Use # or 1–8 letters or numbers, starting with a letter."
              : save.isPending
                ? "Saving…"
                : save.isError
                  ? "Could not save. Try again."
                  : `Next issue: ${formatIssueId(value, 1)}`}
          </SettingsStatus>
        </div>
      }
    />
  );
}
