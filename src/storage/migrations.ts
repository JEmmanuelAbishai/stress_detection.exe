import { REPORTS_STORE, SESSIONS_STORE } from "./db";

/**
 * Runs inside IDBOpenDBRequest.onupgradeneeded. Add a new `if (oldVersion < N)`
 * block per schema change and bump STORAGE_KEYS.dbVersion in constants.ts —
 * never mutate an existing block once it has shipped.
 */
export function runMigrations(db: IDBDatabase, oldVersion: number, _newVersion: number): void {
  if (oldVersion < 1) {
    const sessions = db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
    sessions.createIndex("by_domain", "domain", { unique: false });
    sessions.createIndex("by_startedAt", "startedAt", { unique: false });

    const reports = db.createObjectStore(REPORTS_STORE, { keyPath: "date" });
    reports.createIndex("by_date", "date", { unique: true });
  }

  // Example for the next migration:
  // if (oldVersion < 2) {
  //   const tx = (db as unknown as { transaction: IDBDatabase["transaction"] });
  //   // add new index / store here
  // }
}
