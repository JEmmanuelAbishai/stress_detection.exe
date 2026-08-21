import Papa from "papaparse";
import type { DailyReport, TypingSession } from "@shared/types";

export function sessionsToCSV(sessions: TypingSession[]): string {
  const rows = sessions.map((s) => ({
    id: s.id,
    domain: s.domain,
    startedAt: new Date(s.startedAt).toISOString(),
    endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : "",
    keystrokeCount: s.keystrokeCount,
    stressLevel: s.prediction?.level ?? "",
    stressScore: s.prediction?.score ?? "",
    avgDwellTimeMs: s.features?.avgDwellTimeMs ?? "",
    avgFlightTimeMs: s.features?.avgFlightTimeMs ?? "",
    backspaceRate: s.features?.backspaceRate ?? "",
    typingSpeedCharsPerMin: s.features?.typingSpeedCharsPerMin ?? "",
    pauseRate: s.features?.pauseRate ?? "",
    errorBurstRate: s.features?.errorBurstRate ?? ""
  }));
  return Papa.unparse(rows);
}

export function dailyReportsToCSV(reports: DailyReport[]): string {
  const rows = reports.map((r) => ({
    date: r.date,
    sessionCount: r.sessionCount,
    totalKeystrokes: r.totalKeystrokes,
    avgScore: r.avgScore.toFixed(3),
    calm: r.levelCounts.calm,
    steady: r.levelCounts.steady,
    elevated: r.levelCounts.elevated,
    critical: r.levelCounts.critical,
    topDomain: r.topDomains[0]?.domain ?? ""
  }));
  return Papa.unparse(rows);
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
