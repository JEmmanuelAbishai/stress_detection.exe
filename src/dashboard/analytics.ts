import type { DailyReport, StressLevel, TypingSession } from "@shared/types";

export interface WeeklySummary {
  avgScore: number;
  totalSessions: number;
  totalKeystrokes: number;
  mostCommonLevel: StressLevel;
  trendVsPreviousWeek: number | null; // percentage change, positive = more stress
}

export function summarizeReports(current: DailyReport[], previous: DailyReport[]): WeeklySummary {
  const totalSessions = current.reduce((sum, r) => sum + r.sessionCount, 0);
  const totalKeystrokes = current.reduce((sum, r) => sum + r.totalKeystrokes, 0);
  const scored = current.filter((r) => r.sessionCount > 0);
  const avgScore = scored.length
    ? scored.reduce((sum, r) => sum + r.avgScore, 0) / scored.length
    : 0;

  const levelTotals: Record<StressLevel, number> = { calm: 0, steady: 0, elevated: 0, critical: 0 };
  for (const r of current) {
    (Object.keys(levelTotals) as StressLevel[]).forEach((level) => {
      levelTotals[level] += r.levelCounts[level];
    });
  }
  const mostCommonLevel = (Object.entries(levelTotals) as [StressLevel, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  const prevScored = previous.filter((r) => r.sessionCount > 0);
  const prevAvg = prevScored.length
    ? prevScored.reduce((sum, r) => sum + r.avgScore, 0) / prevScored.length
    : null;

  const trendVsPreviousWeek =
    prevAvg && prevAvg > 0 ? Math.round(((avgScore - prevAvg) / prevAvg) * 100) : null;

  return { avgScore, totalSessions, totalKeystrokes, mostCommonLevel, trendVsPreviousWeek };
}

/** Groups raw sessions by domain, sorted by session count descending. */
export function sessionsByDomain(sessions: TypingSession[]): { domain: string; count: number; avgScore: number }[] {
  const grouped = new Map<string, TypingSession[]>();
  for (const s of sessions) {
    grouped.set(s.domain, [...(grouped.get(s.domain) ?? []), s]);
  }
  return [...grouped.entries()]
    .map(([domain, group]) => {
      const scored = group.filter((s) => s.prediction);
      const avgScore = scored.length
        ? scored.reduce((sum, s) => sum + (s.prediction?.score ?? 0), 0) / scored.length
        : 0;
      return { domain, count: group.length, avgScore };
    })
    .sort((a, b) => b.count - a.count);
}

/** Simple longest-streak-of-calm-days calculator, for a small motivational stat. */
export function longestCalmStreak(reports: DailyReport[]): number {
  let longest = 0;
  let current = 0;
  for (const r of [...reports].sort((a, b) => a.date.localeCompare(b.date))) {
    const dominant = (Object.entries(r.levelCounts) as [StressLevel, number][]).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    if (dominant === "calm" || r.sessionCount === 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}
