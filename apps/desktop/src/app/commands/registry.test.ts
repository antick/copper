import { describe, expect, it } from "vitest";
import {
  commandDefinitions,
  commandFromKeyboard,
} from "@/app/commands/registry";

describe("command registry", () => {
  it("maps core shortcuts to the same command IDs", () => {
    expect(
      commandDefinitions.some((command) => command.id === "command-palette"),
    ).toBe(true);
    const publish = commandDefinitions.find(
      (command) => command.id === "publish-vault-git",
    );
    expect(publish?.label).toBe("Push vault to GitHub");
    expect(publish?.shortcut).toEqual({ mac: "", default: "" });
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    expect(commandFromKeyboard(event)).toBe("command-palette");
    expect(
      commandFromKeyboard(
        new KeyboardEvent("keydown", { key: "b", metaKey: true }),
      ),
    ).toBe("toggle-left-sidebar");
    expect(
      commandFromKeyboard(
        new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          shiftKey: true,
        }),
      ),
    ).toBe("toggle-tasks");
    expect(
      commandFromKeyboard(new KeyboardEvent("keydown", { key: "c" })),
    ).toBeUndefined();
    expect(
      commandDefinitions.some(
        (command) => command.id === "new-issue" && command.shortcut.mac === "C",
      ),
    ).toBe(true);
    expect(
      commandDefinitions.some(
        (command) =>
          command.id === "set-issue-labels" && command.shortcut.mac === "L",
      ),
    ).toBe(true);
  });
});
