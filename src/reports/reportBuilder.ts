import type { DailyReport, StressLevel, TypingSession } from "@shared/types";
import { toDateKey } from "@utils/time";
import { db, REPORTS_STORE } from "@storage/db";
import { sessionsRepo } from "@storage/sessionsRepo";

const EMPTY_LEVEL_COUNTS: Record<StressLevel, number> = {
  calm: 0,
  steady: 0,
  elevated: 0,
  critical: 0
};

export function buildDailyReport(date: string, sessions: TypingSession[]): DailyReport {
  const dayCounts = { ...EMPTY_LEVEL_COUNTS };
  let totalScore = 0;
  let scored = 0;
  let totalKeystrokes = 0;
  const domainCounts = new Map<string, number>();

  for (const session of sessions) {
    totalKeystrokes += session.keystrokeCount;
    domainCounts.set(session.domain, (domainCounts.get(session.domain) ?? 0) + 1);

    if (session.prediction) {
      dayCounts[session.prediction.level] += 1;
      totalScore += session.prediction.score;
      scored += 1;
    }
  }

  const topDomains = [...domainCounts.entries()]
    .map(([domain, sessionCount]) => ({ domain, sessionCount }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 5);

  return {
    date,
    sessionCount: sessions.length,
    totalKeystrokes,
    avgScore: scored ? totalScore / scored : 0,
    levelCounts: dayCounts,
    topDomains
  };
}

/** Rebuilds and persists the DailyReport for `date` from raw sessions. */
export async function aggregateDailyReport(date: string): Promise<DailyReport> {
  const allSessions = await sessionsRepo.getAll();
  const sessionsForDay = allSessions.filter(
    (s) => s.endedAt !== null && toDateKey(s.endedAt) === date
  );
  const report = buildDailyReport(date, sessionsForDay);
  await db.withStore(REPORTS_STORE, "readwrite", (store) => store.put(report));
  return report;
}

export async function getReportsInRange(fromDate: string, toDate: string): Promise<DailyReport[]> {
  const all = await db.getAll<DailyReport>(REPORTS_STORE);
  return all.filter((r) => r.date >= fromDate && r.date <= toDate).sort((a, b) => a.date.localeCompare(b.date));
}
