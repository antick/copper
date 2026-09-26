import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadSession,
  loadSettings,
  saveSession,
  saveSettings,
  sessionPath,
  settingsPath,
} from "./settings";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("settings", () => {
  it("persists the expanded theme allowlist", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-set-themes-"));
    temps.push(dir);

    saveSettings(dir, {
      lightTheme: "tidepool",
      darkTheme: "aurora",
    });

    expect(loadSettings(dir)).toMatchObject({
      lightTheme: "tidepool",
      darkTheme: "aurora",
    });

    saveSettings(dir, {
      lightTheme: "not-a-theme",
      darkTheme: "also-not-a-theme",
    });
    expect(loadSettings(dir)).toMatchObject({
      lightTheme: "linen",
      darkTheme: "graphite",
    });
  });

  it("round trips settings and session", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-set-"));
    temps.push(dir);
    saveSettings(dir, {
      theme: "dark",
      lightTheme: "dawn",
      darkTheme: "nord",
      fontSize: 16,
      lineHeight: 1.55,
      tabSize: 2,
      wrapping: true,
      attachmentFolder: "attachments",
      navigationLayout: "tree",
    });
    const loaded = loadSettings(dir);
    expect(loaded.theme).toBe("dark");
    expect(loaded.lightTheme).toBe("dawn");
    expect(loaded.navigationLayout).toBe("tree");
    saveSession(dir, "vault-1", {
      tabs: [{ path: "a.md", preview: false }],
      activePath: "a.md",
      leftCollapsed: true,
      rightCollapsed: false,
      favorites: ["a.md"],
      workspaceMode: "tasks",
      tasksView: "list",
      tasksProject: "copper",
      tasksDestination: "project",
      tasksProjectView: "issues",
    });
    expect(loadSession(dir, "vault-1").tabs).toEqual([
      { path: "a.md", preview: false },
    ]);
    expect(loadSession(dir, "vault-1").workspaceMode).toBe("tasks");
    expect(loadSession(dir, "vault-1").tasksView).toBe("list");
    expect(loadSession(dir, "vault-1").tasksProject).toBe("copper");
    expect(loadSession(dir, "vault-1").tasksDestination).toBe("project");
    expect(loadSession(dir, "vault-1").tasksProjectView).toBe("issues");
  });

  it("old settings default navigation layout", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-set2-"));
    temps.push(dir);
    fs.writeFileSync(
      settingsPath(dir),
      JSON.stringify({
        theme: "dark",
        fontSize: 19,
        lineHeight: 1.7,
        tabSize: 4,
        wrapping: false,
        attachmentFolder: "files",
      }),
    );
    const settings = loadSettings(dir);
    expect(settings.navigationLayout).toBe("note-list");
    expect(settings.lightTheme).toBe("linen");
    expect(settings.fontSize).toBe(19);
    expect(settings.issueIdPrefix).toBe("ISSUE");
  });

  it("migrates legacy string tabs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-set3-"));
    temps.push(dir);
    const file = sessionPath(dir, "vault-legacy");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({
        tabs: ["legacy.md", { path: "preview.md", preview: true }],
        activePath: "preview.md",
        leftCollapsed: false,
        rightCollapsed: true,
      }),
    );
    const session = loadSession(dir, "vault-legacy");
    expect(session.tabs[0]).toEqual({ path: "legacy.md", preview: false });
    expect(session.tabs[1]).toEqual({ path: "preview.md", preview: true });
    expect(session.workspaceMode).toBe("notes");
    expect(session.tasksView).toBe("board");
    expect(session.tasksProject).toBeNull();
    expect(session.tasksDestination).toBe("all");
    expect(session.tasksProjectView).toBe("board");
  });

  it("drops the old transparency preference when saving settings", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-old-glass-"));
    temps.push(dir);
    fs.writeFileSync(
      settingsPath(dir),
      JSON.stringify({ windowTransparency: 40 }),
    );
    const settings = loadSettings(dir);
    expect(settings).not.toHaveProperty("windowTransparency");
    saveSettings(dir, settings);
    expect(
      JSON.parse(fs.readFileSync(settingsPath(dir), "utf8")),
    ).not.toHaveProperty("windowTransparency");
  });

  it("normalizes task settings and persisted navigation state", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-task-set-"));
    temps.push(dir);
    saveSettings(dir, {
      issueIdPrefix: "work2",
    });
    expect(loadSettings(dir)).toMatchObject({
      issueIdPrefix: "WORK2",
    });
    saveSession(dir, "vault-task", {
      tasksDestination: "active",
      tasksProjectOrder: ["two", "one", "two"],
      tasksPinnedProjects: ["one", "one"],
      tasksListColumnWidths: { id: 2, title: 9999 },
    });
    expect(loadSession(dir, "vault-task")).toMatchObject({
      tasksDestination: "all",
      tasksProjectOrder: ["two", "one"],
      tasksPinnedProjects: ["one"],
      tasksListColumnWidths: { id: 72, title: 560 },
    });
  });
});
