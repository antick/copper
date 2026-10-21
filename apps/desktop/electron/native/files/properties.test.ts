import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { updateProperties } from "./properties";
import { createFile, readFile, saveFile } from "./service";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copper-properties-"));
  roots.push(root);
  createFile(
    root,
    "Note.md",
    "---\nstatus: todo\ntags: [new]\n---\nOriginal\n",
  );
  return root;
}
it("patches only requested properties and keeps the latest body and other properties", () => {
  const root = fixture();
  saveFile(
    root,
    "Note.md",
    "---\nstatus: todo\ntags: [updated]\n---\nNewly saved work\n",
  );
  const [source, revision] = updateProperties(root, "Note.md", {
    status: "done",
  });
  expect(source).toContain("Newly saved work");
  expect(source).toContain("updated");
  expect(source).toContain("status: done");
  expect(revision.hash).toBe(readFile(root, "Note.md")[1].hash);
});
it("refuses stale editor writes without changing the external version", () => {
  const root = fixture();
  const [, before] = readFile(root, "Note.md");
  saveFile(root, "Note.md", "External edit");
  expect(() => saveFile(root, "Note.md", "My draft", before.hash)).toThrow(
    /changed on disk/i,
  );
  expect(readFile(root, "Note.md")[0]).toBe("External edit");
});
