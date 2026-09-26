import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { applySchema, INDEX_SCHEMA_VERSION, schemaVersion } from "./schema";

function discardIndex(dbPath: string): void {
  try {
    fs.unlinkSync(dbPath);
  } catch {
    // Missing or already removed.
  }
}

export function openIndex(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) {
    try {
      const existing = new Database(dbPath);
      if (schemaVersion(existing) === INDEX_SCHEMA_VERSION) {
        applySchema(existing);
        return existing;
      }
      existing.close();
    } catch {
      // Corrupt or unreadable; rebuild below.
    }
    discardIndex(dbPath);
  }
  const db = new Database(dbPath);
  applySchema(db);
  return db;
}

export function indexPathFor(appData: string, vaultId: string): string {
  return path.join(appData, "vaults", vaultId, "index.db");
}
