import chokidar, { type FSWatcher } from "chokidar";
import type { BrowserWindow } from "electron";
import { WATCHER_COALESCE_MS } from "../native/constants";
import { type FileSystemEvent, normalizeWatchPath } from "../native/watcher";
import { appState } from "./state";

let mainWindow: BrowserWindow | null = null;
let coalesceTimer: NodeJS.Timeout | null = null;
const pending = new Map<string, FileSystemEvent>();

export function setWatchWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

export function stopVaultWatcher(): void {
  appState.watcher?.close();
  appState.watcher = null;
  pending.clear();
  if (coalesceTimer) {
    clearTimeout(coalesceTimer);
    coalesceTimer = null;
  }
}

function enqueue(event: FileSystemEvent): void {
  const key =
    event.type === "renamed" ? `${event.from}\0${event.to}` : event.path;
  pending.set(key, event);
  if (coalesceTimer) {
    clearTimeout(coalesceTimer);
  }
  coalesceTimer = setTimeout(flush, WATCHER_COALESCE_MS);
}

function flush(): void {
  const events = [...pending.values()];
  pending.clear();
  coalesceTimer = null;
  for (const payload of events) {
    mainWindow?.webContents.send("vault://fs", payload);
  }
}

export function watchVault(root: string): FSWatcher {
  stopVaultWatcher();
  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    ignored: (watchPath) =>
      watchPath.split(/[/\\]/).some((part) => part.startsWith(".")),
  });
  const emit =
    (type: "created" | "modified" | "removed") => (filePath: string) => {
      const event = normalizeWatchPath(root, filePath, type);
      if (event) {
        enqueue(event);
      }
    };
  watcher.on("add", emit("created"));
  watcher.on("change", emit("modified"));
  watcher.on("unlink", emit("removed"));
  watcher.on("addDir", emit("created"));
  watcher.on("unlinkDir", emit("removed"));
  appState.watcher = watcher;
  return watcher;
}
