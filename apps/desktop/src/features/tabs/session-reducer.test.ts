import { describe, expect, it } from "vitest";
import {
  cycleTab,
  emptySession,
  normalizeSession,
  sessionReducer,
} from "@/features/tabs/session-reducer";

describe("session reducer", () => {
  it("opens, activates, closes, and restores tabs independent of the router", () => {
    let state = sessionReducer(emptySession, { type: "open", path: "a.md" });
    state = sessionReducer(state, { type: "open", path: "b.md" });
    expect(state.tabs).toEqual([
      { path: "a.md", preview: false },
      { path: "b.md", preview: false },
    ]);
    expect(state.activePath).toBe("b.md");
    state = sessionReducer(state, { type: "activate", path: "a.md" });
    expect(cycleTab(state, 1)).toBe("b.md");
    state = sessionReducer(state, { type: "close", path: "a.md" });
    expect(state.activePath).toBe("b.md");
    state = sessionReducer(state, { type: "remove", path: "b.md" });
    expect(state.tabs).toEqual([]);
    state = sessionReducer(state, {
      type: "restore",
      session: {
        ...emptySession,
        tabs: ["gone.md"],
        activePath: "gone.md",
      },
    });
    expect(state.tabs).toEqual([{ path: "gone.md", preview: false }]);
    expect(state.activePath).toBe("gone.md");
    state = sessionReducer(state, { type: "toggle-favorite", path: "gone.md" });
    expect(state.favorites).toEqual(["gone.md"]);
    state = sessionReducer(state, { type: "toggle-favorite", path: "gone.md" });
    expect(state.favorites).toEqual([]);
  });

  it("replaces a preview while preserving pinned tabs and activates existing pinned tabs", () => {
    let state = sessionReducer(emptySession, {
      type: "open-pinned",
      path: "pinned.md",
    });
    state = sessionReducer(state, { type: "open-preview", path: "first.md" });
    state = sessionReducer(state, { type: "open-preview", path: "second.md" });

    expect(state.tabs).toEqual([
      { path: "pinned.md", preview: false },
      { path: "second.md", preview: true },
    ]);
    expect(state.activePath).toBe("second.md");

    state = sessionReducer(state, {
      type: "open-preview",
      path: "pinned.md",
    });
    expect(state.tabs).toEqual([
      { path: "pinned.md", preview: false },
      { path: "second.md", preview: true },
    ]);
    expect(state.activePath).toBe("pinned.md");
  });

  it("pins in place and never creates a second preview", () => {
    let state = sessionReducer(emptySession, {
      type: "open-pinned",
      path: "a.md",
    });
    state = sessionReducer(state, { type: "open-preview", path: "b.md" });
    state = sessionReducer(state, { type: "pin", path: "b.md" });
    expect(state.tabs).toEqual([
      { path: "a.md", preview: false },
      { path: "b.md", preview: false },
    ]);

    state = sessionReducer(state, { type: "open-preview", path: "c.md" });
    state = sessionReducer(state, { type: "open-preview", path: "d.md" });
    expect(state.tabs).toEqual([
      { path: "a.md", preview: false },
      { path: "b.md", preview: false },
      { path: "d.md", preview: true },
    ]);
    expect(state.tabs.filter((tab) => tab.preview)).toHaveLength(1);
  });

  it("normalizes legacy strings, duplicates, multiple previews, and invalid active paths", () => {
    const state = normalizeSession(
      {
        tabs: [
          "legacy.md",
          { path: "preview.md", preview: true },
          { path: "other.md", preview: true },
          { path: "preview.md", preview: false },
        ],
        activePath: "missing.md",
        favorites: ["legacy.md", "legacy.md", "missing.md"],
      },
      ["legacy.md", "preview.md", "other.md"],
    );

    expect(state.tabs).toEqual([
      { path: "legacy.md", preview: false },
      { path: "preview.md", preview: false },
      { path: "other.md", preview: true },
    ]);
    expect(state.activePath).toBeUndefined();
    expect(state.favorites).toEqual(["legacy.md"]);
  });

  it("cleans missing files and clears an active path removed during restore", () => {
    const state = sessionReducer(emptySession, {
      type: "restore",
      session: {
        tabs: [
          { path: "gone.md", preview: false },
          { path: "keep.md", preview: true },
        ],
        activePath: "gone.md",
        favorites: ["gone.md", "keep.md"],
      },
      availablePaths: ["keep.md"],
    });

    expect(state.tabs).toEqual([{ path: "keep.md", preview: true }]);
    expect(state.activePath).toBeUndefined();
    expect(state.favorites).toEqual(["keep.md"]);
  });

  it("updates descendant tabs and favorites while preserving preview metadata", () => {
    const state = {
      ...emptySession,
      tabs: [
        { path: "Projects/Copper/a.md", preview: true },
        { path: "other.md", preview: false },
      ],
      activePath: "Projects/Copper/a.md",
      favorites: ["Projects/Copper/a.md"],
    };
    const renamed = sessionReducer(state, {
      type: "rename",
      from: "Projects/Copper",
      to: "Projects/Copper 2",
    });
    expect(renamed.tabs[0]).toEqual({
      path: "Projects/Copper 2/a.md",
      preview: true,
    });
    expect(renamed.activePath).toBe("Projects/Copper 2/a.md");
    expect(renamed.favorites).toEqual(["Projects/Copper 2/a.md"]);

    const removed = sessionReducer(renamed, {
      type: "remove",
      path: "Projects/Copper 2",
    });
    expect(removed.tabs).toEqual([{ path: "other.md", preview: false }]);
    expect(removed.activePath).toBe("other.md");
    expect(removed.favorites).toEqual([]);
  });

  it("falls back to the next tab, then the previous tab, when the active tab closes", () => {
    let state = normalizeSession({
      tabs: [
        { path: "a.md", preview: false },
        { path: "b.md", preview: true },
        { path: "c.md", preview: false },
      ],
      activePath: "b.md",
    });
    state = sessionReducer(state, { type: "close", path: "b.md" });
    expect(state.activePath).toBe("c.md");
    state = sessionReducer(state, { type: "close", path: "c.md" });
    expect(state.activePath).toBe("a.md");
    state = sessionReducer(state, { type: "remove", path: "a.md" });
    expect(state.activePath).toBeUndefined();
  });

  it("reorders tabs and cycles around the active tab", () => {
    let state = normalizeSession({
      tabs: [
        { path: "a.md", preview: false },
        { path: "b.md", preview: false },
        { path: "c.md", preview: true },
      ],
      activePath: "b.md",
    });
    state = sessionReducer(state, { type: "reorder", from: 1, to: 0 });
    expect(state.tabs.map((tab) => tab.path)).toEqual(["b.md", "a.md", "c.md"]);
    expect(cycleTab(state, 1)).toBe("a.md");
    expect(cycleTab(state, -1)).toBe("c.md");
  });
});
