import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readStyle(name: string) {
  return readFileSync(resolve(process.cwd(), "src/styles", name), "utf8");
}

describe("Tasks styles", () => {
  it("keeps pointer cursors and the shared header divider geometry", () => {
    const controls = readStyle("controls.css");
    const globals = readStyle("globals.css");
    const tasks = readStyle("tasks.css");
    expect(controls).toMatch(/\.copper-icon-button \{[\s\S]*?cursor: pointer;/);
    expect(globals).toMatch(/\.copper-nav-item,[\s\S]*?cursor: pointer;/);
    expect(globals).toMatch(
      /\.copper-activity-rail::after \{[\s\S]*?top: var\(--header-height\);/,
    );
    expect(tasks).toMatch(
      /\.copper-panes-tasks \{[\s\S]*?grid-template-columns: var\(--tasks-nav-width\) 1px minmax\(0, 1fr\);/,
    );
  });

  it("uses Electron drag regions while keeping interactive chrome clickable", () => {
    const globals = readStyle("globals.css");
    expect(globals).toMatch(
      /\[data-copper-drag-region\] \{[\s\S]*?-webkit-app-region: drag;/,
    );
    expect(globals).toMatch(
      /button,[\s\S]*?\[role="treeitem"\] \{[\s\S]*?-webkit-app-region: no-drag;/,
    );
    expect(globals).not.toContain(".copper-header-drag-handle");
  });

  it("keeps Tasks section headers and tab insert cues distinct", () => {
    const globals = readStyle("globals.css");
    const tasks = readStyle("tasks.css");
    const surfaces = readStyle("task-surfaces.css");
    expect(globals).toMatch(
      /\.copper-section-label \{[\s\S]*?display: inline-flex;[\s\S]*?white-space: nowrap;/,
    );
    expect(globals).toMatch(/\.copper-tab\[data-drop-edge="before"\]::before,/);
    expect(globals).toContain("width: var(--tab-drop-marker-width);");
    expect(globals).toMatch(
      /\.copper-document-title \{[\s\S]*?padding: 28px clamp\(28px, 7%, 48px\) 18px;/,
    );
    expect(tasks).toContain("--tasks-drop-slot-min-height: 96px;");
    expect(surfaces).toMatch(
      /\.copper-task-card-overlay \{[\s\S]*?rotate: 4deg;/,
    );
  });
});
