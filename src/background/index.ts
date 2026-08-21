import { DEFAULT_SETTINGS } from "@shared/types";
import type { DailyReport, LevelCounts, TypingSession, UserSettings } from "@shared/types";
import type { DomainCount, MessageResponse, RuntimeMessage } from "@shared/messages";

const SETTINGS_KEY = "settings";
const SESSIONS_KEY = "sessions";
const DAY_MS = 86_400_000;

/**
 * Background service worker: the single message router every surface talks
 * to. Owns settings (chrome.storage.local) and sessions (chrome.storage.local)
 * and computes dashboard aggregates (daily reports, domain breakdown).
 */

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse) => {
    void handleMessage(message)
      .then(sendResponse)
      .catch((err: unknown) => {
        console.error("stress-detector: handler failed", err);
        sendResponse({ ok: false, error: "Background handler failed." });
      });
    return true; // respond asynchronously
  }
);

async function handleMessage(message: RuntimeMessage): Promise<MessageResponse> {
  switch (message.type) {
    case "GET_SETTINGS": {
      const settings = await getSettings();
      return { ok: true, settings };
    }
    case "UPDATE_SETTINGS": {
      const current = await getSettings();
      const next = { ...current, ...message.settings };
      await storageSet({ [SETTINGS_KEY]: next });
      return { ok: true, settings: next };
    }
    case "GET_RECENT_SESSIONS": {
      const sessions = await getSessions();
      const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
      return { ok: true, sessions: message.limit ? sorted.slice(0, message.limit) : sorted };
    }
    case "GET_ALL_SESSIONS": {
      const sessions = await getSessions();
      return { ok: true, sessions: [...sessions].sort((a, b) => b.startedAt - a.startedAt) };
    }
    case "ADD_SESSION": {
      const sessions = await getSessions();
      sessions.push(message.session);
      const settings = await getSettings();
      await pruneAndStore(sessions, settings.retentionDays);
      return { ok: true };
    }
    case "GET_DAILY_REPORTS": {
      const sessions = await getSessions();
      return { ok: true, reports: buildDailyReports(sessions, message.days ?? 30) };
    }
    case "GET_DOMAIN_BREAKDOWN": {
      const sessions = await getSessions();
      return { ok: true, domains: buildDomainBreakdown(sessions) };
    }
  }
}

function storageGet(key: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result ?? {}));
  });
}

function storageSet(patch: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(patch, resolve);
  });
}

async function getSettings(): Promise<UserSettings> {
  const data = await storageGet(SETTINGS_KEY);
  const stored = data[SETTINGS_KEY] as UserSettings | undefined;
  return stored ?? DEFAULT_SETTINGS;
}

async function getSessions(): Promise<TypingSession[]> {
  const data = await storageGet(SESSIONS_KEY);
  const list = data[SESSIONS_KEY] as TypingSession[] | undefined;
  return Array.isArray(list) ? list : [];
}

async function pruneAndStore(sessions: TypingSession[], retentionDays: number): Promise<void> {
  const cutoff = Date.now() - retentionDays * DAY_MS;
  const kept = retentionDays > 0 ? sessions.filter((s) => s.startedAt >= cutoff) : sessions;
  await storageSet({ [SESSIONS_KEY]: kept });
}

function toDateKey(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildDailyReports(sessions: TypingSession[], days: number): DailyReport[] {
  const byDay = new Map<string, { total: number; count: number; levels: LevelCounts; sessions: number }>();

  for (const s of sessions) {
    const key = toDateKey(s.startedAt);
    const agg = byDay.get(key) ?? {
      total: 0,
      count: 0,
      levels: { calm: 0, steady: 0, elevated: 0, critical: 0 },
      sessions: 0
    };
    agg.total += s.prediction.score;
    agg.count += 1;
    agg.levels[s.prediction.level] += 1;
    agg.sessions += 1;
    byDay.set(key, agg);
  }

  const reports: DailyReport[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = toDateKey(date.getTime());
    const agg = byDay.get(key);
    reports.push({
      date: key,
      avgScore: agg && agg.count ? Number((agg.total / agg.count).toFixed(3)) : 0,
      levelCounts: agg?.levels ?? { calm: 0, steady: 0, elevated: 0, critical: 0 },
      sessionCount: agg?.sessions ?? 0
    });
  }
  return reports;
}

function buildDomainBreakdown(sessions: TypingSession[]): DomainCount[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    counts.set(s.domain, (counts.get(s.domain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}