import { useEffect, useState } from "react";
import type { DailyReport, TypingSession } from "@shared/types";
import { sendMessage } from "@shared/messages";
import { StressTrendChart, LevelBreakdownChart, DomainBarChart } from "./charts";

export function DashboardApp() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [domains, setDomains] = useState<{ domain: string; count: number }[]>([]);
  const [sessions, setSessions] = useState<TypingSession[]>([]);
  const [detectionEnabled, setDetectionEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [reportRes, domainRes, sessionRes, settingsRes] = await Promise.all([
        sendMessage({ type: "GET_DAILY_REPORTS", days: 45 }),
        sendMessage({ type: "GET_DOMAIN_BREAKDOWN" }),
        sendMessage({ type: "GET_ALL_SESSIONS" }),
        sendMessage({ type: "GET_SETTINGS" })
      ]);

      if (reportRes.ok && "reports" in reportRes) {
        const sorted = [...reportRes.reports].sort((a, b) => a.date.localeCompare(b.date));
        setReports(sorted);
      }
      if (domainRes.ok && "domains" in domainRes) setDomains(domainRes.domains);
      if (sessionRes.ok && "sessions" in sessionRes) setSessions(sessionRes.sessions);
      if (settingsRes.ok && "settings" in settingsRes) {
        setDetectionEnabled(settingsRes.settings.detectionEnabled);
      }
    } catch (err) {
      setError("Couldn't reach the extension's background service. Try reloading the extension or reopening the dashboard.");
      console.error(err);
    }
  }

  function exportCsv() {
    const header = [
      "startedAt",
      "domain",
      "level",
      "score",
      "avgDwellTimeMs",
      "avgFlightTimeMs",
      "backspaceRate",
      "pauseRate",
      "errorBurstRate"
    ];
    const rows: string[][] = [header];
    for (const s of sessions) {
      const f = s.featureVector;
      rows.push([
        new Date(s.startedAt).toISOString(),
        s.domain,
        s.prediction.level,
        String(s.prediction.score),
        String(f.avgDwellTimeMs),
        String(f.avgFlightTimeMs),
        String(f.backspaceRate),
        String(f.pauseRate),
        String(f.errorBurstRate)
      ]);
    }
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const dateSuffix = new Date().toISOString().slice(0, 10);
    downloadBlob(csv, "text/csv", `stress-report-${dateSuffix}.csv`);
  }

  const hasData = sessions.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Stress dashboard</h1>
          <p className="text-sm text-slate-400">
            Typing stress trends, computed only on this device.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {detectionEnabled !== null && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                detectionEnabled ? "bg-signal-calm/15 text-signal-calm" : "bg-slate-100 text-slate-400"
              }`}
            >
              Detection {detectionEnabled ? "on" : "off"}
            </span>
          )}
          <button
            onClick={exportCsv}
            disabled={!hasData}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600/90 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </header>

      {error && <p className="mb-6 rounded-lg bg-signal-elevated/10 p-3 text-sm text-signal-elevated">{error}</p>}

      {!hasData && !error && (
        <p className="mb-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-500">
          No captured sessions yet. Type on any page with detection enabled, then come back here.
        </p>
      )}

      <section className="card mb-6">
        <h2 className="mb-1 font-display text-sm font-semibold">Avg. stress score</h2>
        <p className="mb-3 text-xs text-slate-400">Daily mean of the 0–1 stress score.</p>
        <div className="h-72">
          <StressTrendChart reports={reports} />
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="mb-1 font-display text-sm font-semibold">Stress level breakdown</h2>
        <p className="mb-3 text-xs text-slate-400">Sessions per band, stacked by day.</p>
        <div className="h-72">
          <LevelBreakdownChart reports={reports} />
        </div>
      </section>

      <section className="card">
        <h2 className="mb-1 font-display text-sm font-semibold">Top domains</h2>
        <p className="mb-3 text-xs text-slate-400">Where stress sessions originated.</p>
        <div className="h-72">
          <DomainBarChart domains={domains} />
        </div>
      </section>
    </div>
  );
}

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadBlob(content: string, mime: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}