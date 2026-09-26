import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsSwitch,
} from "@/features/settings/settings-controls";

function Fixture() {
  const [layout, setLayout] = useState("note-list");
  const [wrapping, setWrapping] = useState(false);
  return (
    <SettingsPage title="Workspace" description="Choose a navigation layout.">
      <SettingsSection title="Layout">
        <SettingsRow
          label="Browse files with"
          description="Choose one file presentation."
          control={
            <SettingsSelect
              aria-label="Navigation layout"
              value={layout}
              onChange={(event) => setLayout(event.target.value)}
            >
              <option value="note-list">Note list</option>
              <option value="tree">File tree</option>
            </SettingsSelect>
          }
        />
        <SettingsRow
          label="Wrap lines"
          control={
            <SettingsSwitch
              label="Wrap lines"
              checked={wrapping}
              onCheckedChange={setWrapping}
            />
          }
        />
      </SettingsSection>
    </SettingsPage>
  );
}

describe("Settings controls", () => {
  it("exposes labels and remains keyboard operable", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    expect(
      screen.getByRole("heading", { name: "Workspace" }),
    ).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Navigation layout" });
    const toggle = screen.getByRole("checkbox", { name: "Wrap lines" });

    select.focus();
    await user.selectOptions(select, "tree");
    expect(select).toHaveValue("tree");

    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toBeChecked();
  });
});
