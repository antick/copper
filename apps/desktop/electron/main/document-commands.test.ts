import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { validateInvocation } from "../../src/lib/copper/command-contract";
import {
  archiveFile,
  createFile,
  readFile,
  saveFile,
} from "../native/files/service";
import { indexPathFor } from "../native/index/db";
import { indexVault } from "../native/index/indexer";
import { createIssue } from "../native/tasks/service";
import { VaultManager } from "../native/vaults";
import { handleCommand } from "./handlers";
import { appState } from "./state";

vi.mock("electron", () => ({ app: {}, dialog: {} }));
let root: string;
let vaultId: string;
let parent: string;
beforeEach(() => {
  parent = fs.mkdtempSync(path.join(os.tmpdir(), "copper-command-"));
  root = path.join(parent, "vault");
  fs.mkdirSync(root);
  appState.dataDir = path.join(parent, "data");
  appState.configDir = appState.dataDir;
  appState.vaults = new VaultManager(appState.dataDir);
  appState.vaults.grantSelection(root);
  vaultId = appState.vaults.openVault(root).id;
});
afterEach(() => {
  appState.vaults = null;
  fs.rmSync(parent, { recursive: true, force: true });
});
function invoke(command: string, args: Record<string, unknown>) {
  return handleCommand(
    command,
    validateInvocation(command, { vaultId, ...args }),
  );
}
it("routes guarded saves and rejects writes based on an old disk version", async () => {
  createFile(root, "Note.md", "Original");
  const [, rev] = readFile(root, "Note.md");
  saveFile(root, "Note.md", "External");
  await expect(
    invoke("save_file", {
      path: "Note.md",
      contents: "Draft",
      expectedHash: rev.hash,
    }),
  ).rejects.toMatchObject({ code: "conflict" });
  expect(readFile(root, "Note.md")[0]).toBe("External");
});
it("only accepts property patches and keeps the current saved body", async () => {
  createFile(root, "Note.md", "---\nstatus: todo\n---\nLatest body");
  const result = (await invoke("update_properties", {
    path: "Note.md",
    values: { status: "done" },
  })) as [string, { hash: string }];
  expect(result[0]).toContain("Latest body");
  expect(result[0]).toContain("status: done");
  expect(result[1].hash).toBe(readFile(root, "Note.md")[1].hash);
  expect(() =>
    validateInvocation("update_properties", {
      vaultId,
      path: "Note.md",
      properties: { raw: "", body: "Old body", values: {} },
    }),
  ).toThrow();
});
it("exposes archived issues only through the explicit optional bridge flag", async () => {
  const db = indexPathFor(appState.dataDir, vaultId);
  indexVault(db, root);
  const issue = createIssue(root, db, { title: "Recover me" });
  archiveFile(root, issue.path);
  indexVault(db, root);
  expect(await invoke("list_issues", {})).toEqual([]);
  expect(await invoke("list_issues", { includeArchived: true })).toEqual([
    expect.objectContaining({ id: issue.id }),
  ]);
  expect(() =>
    validateInvocation("list_issues", { vaultId, includeArchived: "true" }),
  ).toThrow();
});
