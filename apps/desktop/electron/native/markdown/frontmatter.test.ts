import { describe, expect, it } from "vitest";
import { parseFrontmatter, writeFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
  it("parses valid and missing frontmatter", () => {
    const none = parseFrontmatter("# Hi\n");
    expect(none.values).toEqual({});
    expect(none.body).toBe("# Hi\n");
    const parsed = parseFrontmatter(
      "---\ntype: essay\ntags:\n  - a\n---\nBody\n",
    );
    expect(parsed.values.type).toBe("essay");
    expect(parsed.body).toBe("Body\n");
  });

  it("rejects malformed yaml", () => {
    expect(() => parseFrontmatter("---\n: : :\n---\nBody\n")).toThrow();
  });

  it("parses lists dates and booleans", () => {
    const parsed = parseFrontmatter(
      "---\ndraft: true\ndate: 2026-03-11\ncount: 3\ntags:\n  - product\n  - research\n---\nKept\n",
    );
    expect(parsed.values.draft).toBe(true);
    expect(parsed.values.count).toBe(3);
    expect(parsed.body).toBe("Kept\n");
  });

  it("preserves body bytes on mutation", () => {
    const source = "---\nstatus: draft\n---\nHello **world**\n";
    const parsed = parseFrontmatter(source);
    parsed.values.status = "evergreen";
    const next = writeFrontmatter(parsed, source);
    expect(parseFrontmatter(next).body).toBe(parsed.body);
  });

  it("round-trips extra keys and label arrays on an issue", () => {
    const source = `---
type: issue
id: COPP-12
status: todo
labels:
  - perf
  - ui
assignee: example-user
---
# Fast board

Keep the body.
`;
    const parsed = parseFrontmatter(source);
    expect(parsed.values.type).toBe("issue");
    expect(parsed.values.labels).toEqual(["perf", "ui"]);
    expect(parsed.values.assignee).toBe("example-user");
    parsed.values.status = "in_progress";
    const next = writeFrontmatter(parsed, source);
    const written = parseFrontmatter(next);
    expect(written.values.status).toBe("in_progress");
    expect(written.values.assignee).toBe("example-user");
    expect(written.values.labels).toEqual(["perf", "ui"]);
    expect(written.body).toBe(parsed.body);
  });

  it("treats missing type as ordinary markdown", () => {
    const parsed = parseFrontmatter("# Meeting\n");
    expect(parsed.values.type).toBeUndefined();
    expect(parsed.body).toBe("# Meeting\n");
  });
});
