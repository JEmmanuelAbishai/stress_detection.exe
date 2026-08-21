import { db, SESSIONS_STORE } from "./db";
import type { TypingSession } from "@shared/types";
import { daysAgo } from "@utils/time";

export const sessionsRepo = {
  async upsert(session: TypingSession): Promise<void> {
    await db.withStore(SESSIONS_STORE, "readwrite", (store) => store.put(session));
  },

  async get(id: string): Promise<TypingSession | undefined> {
    return db.withStore<TypingSession | undefined>(SESSIONS_STORE, "readonly", (store) => store.get(id));
  },

  async getAll(): Promise<TypingSession[]> {
    return db.getAll<TypingSession>(SESSIONS_STORE);
  },

  async getByDomain(domain: string): Promise<TypingSession[]> {
    return db.getAllFromIndex<TypingSession>(SESSIONS_STORE, "by_domain", domain);
  },

  async getRecent(limit: number): Promise<TypingSession[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
  },

  async getInRange(fromEpochMs: number, toEpochMs: number): Promise<TypingSession[]> {
    const all = await this.getAll();
    return all.filter((s) => s.startedAt >= fromEpochMs && s.startedAt <= toEpochMs);
  },

  async delete(id: string): Promise<void> {
    await db.withStore(SESSIONS_STORE, "readwrite", (store) => store.delete(id));
  },

  /** Removes sessions older than retentionDays. Called from a periodic alarm. */
  async pruneOlderThan(retentionDays: number): Promise<number> {
    const cutoff = daysAgo(retentionDays);
    const all = await this.getAll();
    const stale = all.filter((s) => s.startedAt < cutoff);
    for (const session of stale) {
      await this.delete(session.id);
    }
    return stale.length;
  }
};
