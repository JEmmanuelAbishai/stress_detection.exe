import { useEffect, useMemo, useState } from "react";
import type { DailyReport, TypingSession } from "@shared/types";
import { sendMessage } from "@shared/messages";
import { toDateKey, daysAgo } from "@utils/time";
import { getReportsInRange } from "@reports/reportBuilder";
import { longestCalmStreak, sessionsByDomain, summarizeReports } from "./analytics";
import { DomainBarChart, LevelBreakdownChart, StressTrendChart } from "./charts";
import { STRESS_LEVEL_LABELS } from "@shared/constants";

const RANGE_DAYS = 14;

export function DashboardApp() {
  const [sessions, setSessions] = useState<TypingSession[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [previousReports, setPreviousReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const fromDate = toDateKey(daysAgo(RANGE_DAYS));
    const prevFromDate = toDateKey(daysAgo(RANGE_DAYS * 2));
    const toDate = toDateKey(Date.now());

    const [sessionsRes, currentReports, prevReports] = await Promise.all([
      sendMessage({ type: "GET_RECENT_SESSIONS", limit: 500 }),
      getReportsInRange(fromDate, toDate),
      getReportsInRange(prevFromDate, fromDate)
    ]);

    if (sessionsRes.ok && "sessions" in sessionsRes) setSessions(sessionsRes.sessions);
    setReports(currentReports);
    setPreviousReports(prevReports);
    setLoading(false);
  }

  const summary = useMemo(() => summarizeReports(reports, previousReports), [reports, previousReports]);
  const domains = useMemo(() => sessionsByDomain(sessions).slice(0, 8), [sessions]);
  const calmStreak = useMemo(() => longestCalmStreak(reports), [reports]);

  async function handleExport(format: "csv" | "pdf") {
    const from = reports[0]?.date ?? toDateKey(daysAgo(RANGE_DAYS));
    const to = reports[reports.length - 1]?.date ?? toDateKey(Date.now());
    await sendMessage({ type: "REQUEST_EXPORT", format, range: { from, to } });
  }

return (
  <div className="mx-auto max-w-5xl bg-black px-6 py-8 text-cyan font-body min-h-screen">
    <header className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-neonYellow neon-text">
          // cyberpsychosis levels
        </h1>
        <p className="text-sm text-cyan/60 font-mono">
          // last {RANGE_DAYS} days · local scan only
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleExport("csv")}
          className="rounded border border-cyan/50 px-3 py-2 text-sm font-display uppercase tracking-wide text-cyan hover:bg-cyan hover:text-black hover:shadow-neon transition"
        >
          // fetch csv
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="rounded border border-neonYellow px-3 py-2 text-sm font-display uppercase tracking-wide text-neonYellow hover:bg-neonYellow hover:text-black hover:shadow-neon transition"
        >
          // fetch pdf
        </button>
      </div>
    </header>

      {loading ? (
        <p className="text-sm text-slate-400">Loading your data…</p>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-4 gap-4">
            <StatCard label="Avg. stress score" value={summary.avgScore.toFixed(2)} trend={summary.trendVsPreviousWeek} />
            <StatCard label="Sessions" value={String(summary.totalSessions)} />
            <StatCard label="Keystrokes analyzed" value={summary.totalKeystrokes.toLocaleString()} />
            <StatCard label="Longest calm streak" value={`${calmStreak} day${calmStreak === 1 ? "" : "s"}`} />
          </section>

          <section className="card mb-6">
            <h2 className="mb-4 font-display text-sm font-semibold">Stress score over time</h2>
            <div className="h-64">
              <StressTrendChart reports={reports} />
            </div>
          </section>

          <div className="mb-6 grid grid-cols-2 gap-6">
            <section className="card">
              <h2 className="mb-4 font-display text-sm font-semibold">Daily breakdown by level</h2>
              <div className="h-64">
                <LevelBreakdownChart reports={reports} />
              </div>
            </section>

            <section className="card">
              <h2 className="mb-4 font-display text-sm font-semibold">Sessions by site</h2>
              <div className="h-64">
                <DomainBarChart domains={domains} />
              </div>
            </section>
          </div>

          <section className="card">
            <h2 className="mb-1 font-display text-sm font-semibold">Most common level this period</h2>
            <p className="text-sm text-cyan/70">{STRESS_LEVEL_LABELS[summary.mostCommonLevel]}</p>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: number | null }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-widest text-cyan/50 font-mono">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-neonYellow neon-text">{value}</p>
      {trend !== undefined && trend !== null && (
        <p className={`mt-1 text-xs font-mono ${trend > 0 ? "text-crimson" : "text-cyan"}`}>
          {trend > 0 ? "+" : ""}
          {trend}% vs previous period
        </p>
      )}
    </div>
  );
}