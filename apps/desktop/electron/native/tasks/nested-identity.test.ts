import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { restoreFile } from "../files/service";
import { indexVault } from "../index/indexer";
import { allocateIssueId, parseIssueId } from "./ids";
import { createIssue } from "./service";

const vaults: string[] = [];

afterEach(() => {
  for (const root of vaults.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeVault(name: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `copper-${name}-`));
  vaults.push(root);
  return root;
}

function writeTask(
  root: string,
  relative: string,
  kind: "issue" | "project",
  id: string,
): void {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(
    absolute,
    `---\ntype: ${kind}\nid: ${id}\nstatus: todo\n---\n# ${id}\n`,
  );
}

describe("task identity discovery", () => {
  it("allocates around nested active and ordinary archived issues", () => {
    const root = makeVault("nested-allocation");
    writeTask(root, "Research/Issues/current.md", "issue", "ISSUE-50");
    writeTask(root, "Archive/Research/Issues/old.md", "issue", "ISSUE-8");
    writeTask(root, "Research/.draft/Issues/hidden.md", "issue", "ISSUE-99");

    expect(allocateIssueId(root)).toBe("ISSUE-51");
  });

  it("rejects the nested duplicate from the primary allocator and restore repro", () => {
    const root = makeVault("nested-identity");
    const dbPath = path.join(root, "index.db");
    const writeIssue = (relative: string, id: string) =>
      writeTask(root, relative, "issue", id);

    expect(createIssue(root, dbPath, { title: "First" }).id).toBe("ISSUE-1");
    writeIssue("Research/Issues/ISSUE-2-nested.md", "ISSUE-2");
    writeIssue("Research/Issues/ISSUE-4-nested.md", "ISSUE-4");
    indexVault(dbPath, root);

    expect(createIssue(root, dbPath, { title: "Nested duplicate" }).id).toBe(
      "ISSUE-5",
    );

    const archived = ".copper/tasks/archive/issues/ISSUE-4-old.md";
    const activeNested = "Research/Issues/ISSUE-4-nested.md";
    writeIssue(archived, "ISSUE-4");
    expect(() => restoreFile(root, archived)).toThrow(
      "because it is already active",
    );
    expect(fs.existsSync(path.join(root, archived))).toBe(true);
    expect(
      fs.existsSync(path.join(root, ".copper/tasks/issues/ISSUE-4-old.md")),
    ).toBe(false);
    expect(fs.existsSync(path.join(root, activeNested))).toBe(true);
  });

  it("rejects generic Archive restores that collide with a nested issue", () => {
    const root = makeVault("generic-restore");
    const archived = "Archive/Research/Issues/ISSUE-3-old.md";
    writeTask(root, "Research/Issues/ISSUE-3-current.md", "issue", "ISSUE-3");
    writeTask(root, archived, "issue", "ISSUE-3");

    expect(() => restoreFile(root, archived)).toThrow(
      "because it is already active",
    );
    expect(fs.existsSync(path.join(root, archived))).toBe(true);
    expect(
      fs.existsSync(path.join(root, "Research/Issues/ISSUE-3-old.md")),
    ).toBe(false);
  });

  it("canonicalizes recognized issue ID aliases only for collision comparison", () => {
    const root = makeVault("canonical-issue-id");
    writeTask(root, "Research/Issues/current.md", "issue", "ISSUE-1");

    for (const [name, id] of [
      ["lowercase", "issue-1"],
      ["zero-padded", "issue-01"],
    ]) {
      const archived = `Archive/Research/Issues/${name}.md`;
      writeTask(root, archived, "issue", id);
      expect(() => restoreFile(root, archived)).toThrow(
        "because it is already active",
      );
      expect(fs.existsSync(path.join(root, archived))).toBe(true);
      expect(fs.readFileSync(path.join(root, archived), "utf8")).toContain(
        `id: ${id}`,
      );
    }
  });

  it("preserves zero-sequence IDs without throwing during allocation or restore", () => {
    const root = makeVault("zero-issue-id");
    writeTask(root, "Research/Issues/active-zero.md", "issue", "ISSUE-0");
    const archived = "Archive/Research/Issues/archived-zero.md";
    writeTask(root, archived, "issue", "ISSUE-0");

    expect(parseIssueId("ISSUE-0")).toBeUndefined();
    expect(allocateIssueId(root)).toBe("ISSUE-1");
    expect(() => restoreFile(root, archived)).toThrow(
      "because it is already active",
    );
  });

  it("rejects project identity collisions before moving an archived project", () => {
    const root = makeVault("project-restore");
    const archived = ".copper/tasks/archive/projects/old-team.md";
    writeTask(root, "Research/Projects/team.md", "project", "team");
    writeTask(root, archived, "project", "team");

    expect(() => restoreFile(root, archived)).toThrow(
      "because it is already active",
    );
    expect(fs.existsSync(path.join(root, archived))).toBe(true);
    expect(
      fs.existsSync(path.join(root, ".copper/tasks/projects/old-team.md")),
    ).toBe(false);
  });

  it("keeps project IDs exact during restore comparison", () => {
    const root = makeVault("project-id-case");
    const archived = ".copper/tasks/archive/projects/old-team.md";
    writeTask(
      root,
      ".copper/tasks/projects/current-team.md",
      "project",
      "Team",
    );
    writeTask(root, archived, "project", "team");

    expect(restoreFile(root, archived)).toBe(
      ".copper/tasks/projects/old-team.md",
    );
    expect(fs.existsSync(path.join(root, archived))).toBe(false);
  });

  it("uses disk identities when the Vault index is stale", () => {
    const root = makeVault("stale-index");
    const dbPath = path.join(root, "index.db");
    indexVault(dbPath, root);
    writeTask(root, "Research/Issues/new-on-disk.md", "issue", "ISSUE-12");

    expect(createIssue(root, dbPath, { title: "After stale index" }).id).toBe(
      "ISSUE-13",
    );
  });

  it("keeps malformed managed issue filenames reserved", () => {
    const root = makeVault("malformed-managed");
    const absolute = path.join(root, ".copper/tasks/issues/ISSUE-33-broken.md");
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "---\ntype: [invalid\n---\nBroken\n");

    expect(allocateIssueId(root)).toBe("ISSUE-34");
  });

  it("restores an ordinary archived note unchanged", () => {
    const root = makeVault("ordinary-note");
    const archived = "Archive/Research/meeting.md";
    const absolute = path.join(root, archived);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "---\ntitle: Meeting\n---\n# Meeting\n");

    expect(restoreFile(root, archived)).toBe("Research/meeting.md");
    expect(
      fs.readFileSync(path.join(root, "Research/meeting.md"), "utf8"),
    ).toBe("---\ntitle: Meeting\n---\n# Meeting\n");
  });
});
