import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatIssueId,
  normalizeIssueIdPrefix,
  parseIssueIdentifier,
} from "../../../src/lib/copper/task-settings";
import {
  allocateIssueId,
  nextIssueId,
  parseIssueId,
  scanIssueIds,
} from "./ids";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("nextIssueId", () => {
  it("fills the gap after 1 and 4 with 5", () => {
    expect(nextIssueId("COPP", ["COPP-1", "COPP-4"])).toBe("COPP-5");
  });

  it("supports one-character and compact hash sequences independently", () => {
    expect(nextIssueId("I", ["I-1", "I-4", "ISSUE-9"])).toBe("I-5");
    expect(nextIssueId("#", ["#1", "#4", "I-9"])).toBe("#5");
  });

  it("parses supported identifiers and rejects invalid inputs", () => {
    expect(parseIssueId("I-1")).toBe("I-1");
    expect(parseIssueId("i-1-title.md")).toBe("I-1");
    expect(parseIssueId("#1-title.md")).toBe("#1");
    expect(parseIssueId("1-1-title.md")).toBeUndefined();
    expect(parseIssueId("I_1-title.md")).toBeUndefined();
    expect(parseIssueIdentifier("#1")).toEqual({ prefix: "#", sequence: 1 });
    expect(parseIssueIdentifier("i-1")).toEqual({ prefix: "I", sequence: 1 });
    expect(formatIssueId("#", 1)).toBe("#1");
    expect(formatIssueId("i", 1)).toBe("I-1");
    expect(normalizeIssueIdPrefix("i")).toBe("I");
    expect(normalizeIssueIdPrefix("#")).toBe("#");
    expect(normalizeIssueIdPrefix("1bad")).toBe("ISSUE");
    expect(normalizeIssueIdPrefix("A-")).toBe("ISSUE");
  });
});

describe("allocateIssueId", () => {
  it("refuses to reuse an on-disk id when the index is stale", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-ids-"));
    temps.push(dir);
    const issues = path.join(dir, "Tasks", "Issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(
      path.join(issues, "COPP-1-one.md"),
      "---\ntype: issue\nid: COPP-1\n---\n# One\n",
    );
    fs.writeFileSync(
      path.join(issues, "COPP-7-seven.md"),
      "---\ntype: issue\nid: COPP-7\n---\n# Seven\n",
    );
    expect(allocateIssueId(dir, "COPP")).toBe("COPP-8");
  });

  it("counts a frontmatter id when the filename has no prefix", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-ids-fm-"));
    temps.push(dir);
    const issues = path.join(dir, "Tasks", "Issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(
      path.join(issues, "meeting.md"),
      "---\ntype: issue\nid: COPP-3\n---\n# Meeting\n",
    );
    expect(allocateIssueId(dir, "COPP")).toBe("COPP-4");
  });

  it("keeps independent sequences when the configured prefix changes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-ids-prefix-"));
    temps.push(dir);
    const issues = path.join(dir, "Tasks", "Issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(
      path.join(issues, "COPP-7-legacy.md"),
      "---\ntype: issue\nid: COPP-7\n---\n# Legacy\n",
    );
    fs.writeFileSync(
      path.join(issues, "ISSUE-3-current.md"),
      "---\ntype: issue\nid: ISSUE-3\n---\n# Current\n",
    );
    expect(allocateIssueId(dir)).toBe("ISSUE-4");
    expect(allocateIssueId(dir, "WORK")).toBe("WORK-1");
    expect(allocateIssueId(dir, "COPP")).toBe("COPP-8");
  });

  it("scans compact hash filenames and avoids collisions across prefixes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copper-ids-compact-"));
    temps.push(dir);
    const issues = path.join(dir, "Tasks", "Issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(
      path.join(issues, "I-1-one.md"),
      "---\ntype: issue\nid: I-1\n---\n# One\n",
    );
    fs.writeFileSync(
      path.join(issues, "I-7-seven.md"),
      "---\ntype: issue\nid: I-7\n---\n# Seven\n",
    );
    fs.writeFileSync(
      path.join(issues, "#1-one.md"),
      "---\ntype: issue\nid: #1\n---\n# Hash one\n",
    );
    fs.writeFileSync(
      path.join(issues, "#7-seven.md"),
      "---\ntype: issue\nid: #7\n---\n# Hash seven\n",
    );
    expect(scanIssueIds(dir)).toEqual(
      expect.arrayContaining(["I-1", "I-7", "#1", "#7"]),
    );
    expect(allocateIssueId(dir, "I")).toBe("I-8");
    expect(allocateIssueId(dir, "#")).toBe("#8");
  });
});
