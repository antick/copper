import { isHiddenTaskContent } from "../../../shared/task-paths";
import { loadSession, saveSession } from "../settings";
import type { TaskPathMove } from "./storage-links";

export function migrateTaskSession(
  dataDir: string,
  vaultId: string,
  moves: TaskPathMove[],
) {
  if (!moves.length) return;
  const session = loadSession(dataDir, vaultId);
  const mapping = new Map(moves.map((move) => [move.from, move.to]));
  const remap = (path: string) => mapping.get(path) ?? path;
  saveSession(dataDir, vaultId, {
    ...session,
    tabs: session.tabs.map((tab) => ({ ...tab, path: remap(tab.path) })),
    activePath: session.activePath ? remap(session.activePath) : null,
    favorites: session.favorites
      .map(remap)
      .filter((path) => !isHiddenTaskContent(path)),
  });
}
