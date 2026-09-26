import type { FSWatcher } from "chokidar";
import { GitTrust } from "../native/git/trust";
import type { VaultManager } from "../native/vaults";

export class AppState {
  readonly gitTrust = new GitTrust();
  vaults: VaultManager | null = null;
  watcher: FSWatcher | null = null;
  dataDir = "";
  configDir = "";
}

export const appState = new AppState();
