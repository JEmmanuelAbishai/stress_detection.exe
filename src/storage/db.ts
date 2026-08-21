import { STORAGE_KEYS } from "@shared/constants";
import { runMigrations } from "./migrations";

/**
 * Thin promise-based wrapper around IndexedDB. We use IndexedDB (rather than
 * chrome.storage.local) for session/report data because it scales far better
 * for potentially thousands of typing sessions; chrome.storage.local is used
 * only for small, frequently-read UserSettings (see settingsRepo.ts).
 */
export class Database {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.open();
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_KEYS.dbName, STORAGE_KEYS.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        runMigrations(db, event.oldVersion, event.newVersion ?? STORAGE_KEYS.dbVersion);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T> {
    const db = await this.dbPromise;
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = fn(store);

      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));

      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        tx.oncomplete = () => resolve(undefined as T);
      }
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.withStore<T[]>(storeName, "readonly", (store) => store.getAll());
  }

  async getAllFromIndex<T>(storeName: string, indexName: string, query?: IDBValidKey): Promise<T[]> {
    const db = await this.dbPromise;
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const index = tx.objectStore(storeName).index(indexName);
      const request = query !== undefined ? index.getAll(query) : index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const SESSIONS_STORE = "sessions";
export const REPORTS_STORE = "daily_reports";

export const db = new Database();
