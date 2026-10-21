import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { expect, it, vi } from "vitest";
import { setWatchWindow, stopVaultWatcher, watchVault } from "./watch";

it("delivers hidden task edits while ignoring other hidden content", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "copper-task-watch-"));
  const root = path.join(parent, ".vault");
  const source = ".copper/tasks/issues/ISSUE-1.md";
  fs.mkdirSync(path.join(root, ".copper/tasks/issues"), { recursive: true });
  fs.writeFileSync(path.join(root, source), "# One");
  const send = vi.fn();
  setWatchWindow({ webContents: { send } } as unknown as BrowserWindow);
  let watcher: ReturnType<typeof watchVault> | undefined;
  try {
    watcher = watchVault(fs.realpathSync(root));
    const readyWatcher = watcher;
    await new Promise<void>((resolve, reject) => {
      readyWatcher.once("ready", resolve);
      readyWatcher.once("error", reject);
    });
    // macOS can finish registering directory watches after Chokidar's ready
    // event. Confirm delivery before measuring one-shot source edits.
    let probe = 0;
    await vi.waitFor(
      () => {
        fs.writeFileSync(path.join(root, `watch-ready-${probe++}.md`), "ready");
        expect(
          send.mock.calls.some(
            ([, event]) =>
              event.type === "created" && event.path.startsWith("watch-ready-"),
          ),
        ).toBe(true);
      },
      { timeout: 3000 },
    );
    fs.writeFileSync(path.join(root, "Note.md"), "visible");
    await vi.waitFor(
      () =>
        expect(send).toHaveBeenCalledWith("vault://fs", {
          type: "created",
          path: "Note.md",
        }),
      { timeout: 3000 },
    );
    await fs.promises.writeFile(path.join(root, source), "# Edited");
    await fs.promises.writeFile(
      path.join(root, ".copper/private.md"),
      "hidden",
    );
    await vi.waitFor(
      () =>
        expect(send).toHaveBeenCalledWith("vault://fs", {
          type: "modified",
          path: source,
        }),
      { timeout: 3000 },
    );
    expect(
      send.mock.calls.every(([, event]) => event.path !== ".copper/private.md"),
    ).toBe(true);
  } finally {
    stopVaultWatcher();
    await watcher?.close();
    setWatchWindow(null);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
