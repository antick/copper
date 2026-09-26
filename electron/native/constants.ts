export const APP_NAME = "Copper";
export const APP_ID = "app.copper.desktop";
export const USER_DATA_DIR_NAME = "app.copper.desktop";

export const WINDOW_WIDTH = 1280;
export const WINDOW_HEIGHT = 800;
export const WINDOW_MIN_WIDTH = 800;
export const WINDOW_MIN_HEIGHT = 560;
export const HEADER_HEIGHT = 42;
export const TRAFFIC_LIGHT_X = 16;
export const TRAFFIC_LIGHT_BUTTON_HEIGHT = 14;
export const TRAFFIC_LIGHT_Y = Math.round(
  (HEADER_HEIGHT - TRAFFIC_LIGHT_BUTTON_HEIGHT) / 2,
);

export const MAX_SUPPORTED_FILE_SIZE = 25 * 1024 * 1024;
export const ARCHIVE_DIR = "Archive";
export const RECENT_VAULT_LIMIT = 12;
export const WATCHER_COALESCE_MS = 45;

export const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  ".obsidian",
  ".DS_Store",
]);

export const UPDATE_GITHUB_REPOSITORY = "antick/copper";
export const UPDATE_CHECK_INTERVAL_MS = 120_000;
export const UPDATE_CHECK_FOCUS_MIN_MS = 60_000;
