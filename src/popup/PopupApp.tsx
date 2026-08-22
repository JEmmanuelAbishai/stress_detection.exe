import { useEffect, useState } from "react";
import type { StressLevel, TypingSession, UserSettings } from "@shared/types";
import { sendMessage } from "@shared/messages";
import { PopupChart } from "./popupChart";

const LEVEL_STYLES: Record<StressLevel, { label: string; dot: string; bg: string }> = {
  calm: { label: "Calm", dot: "bg-signal-calm", bg: "bg-signal-calm/10" },
  steady: { label: "Steady", dot: "bg-signal-steady", bg: "bg-signal-steady/10" },
  elevated: { label: "Elevated", dot: "bg-signal-elevated", bg: "bg-signal-elevated/10" },
  critical: { label: "Critical", dot: "bg-signal-critical", bg: "bg-signal-critical/10" }
};

export function PopupApp() {
  const [sessions, setSessions] = useState<TypingSession[] | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === "PREDICTION_READY") void loadData();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  async function loadData() {
    try {
      const [sessionsRes, settingsRes] = await Promise.all([
        sendMessage({ type: "GET_RECENT_SESSIONS", limit: 10 }),
        sendMessage({ type: "GET_SETTINGS" })
      ]);
      if (sessionsRes.ok && "sessions" in sessionsRes) setSessions(sessionsRes.sessions);
      if (settingsRes.ok && "settings" in settingsRes) setSettings(settingsRes.settings);
    } catch (err) {
      setError("Couldn't reach the extension's background service. Try reloading the page.");
      console.error(err);
    }
  }

  async function toggleDetection() {
    if (!settings) return;
    const next = { ...settings, detectionEnabled: !settings.detectionEnabled };
    setSettings(next);
    await sendMessage({ type: "UPDATE_SETTINGS", settings: { detectionEnabled: next.detectionEnabled } });
  }

  const latest = sessions?.[0] ?? null;
  const level = latest?.prediction?.level ?? "calm";
  const styles = LEVEL_STYLES[level];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-sm font-semibold tracking-tight">Typing Stress Detector</h1>
          <p className="text-xs text-slate-400">Local, on-device analysis</p>
        </div>
        <button
          onClick={toggleDetection}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            settings?.detectionEnabled
              ? "bg-signal-calm/15 text-signal-calm"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {settings?.detectionEnabled ? "On" : "Off"}
        </button>
      </header>

      {error && <p className="rounded-lg bg-signal-elevated/10 p-2 text-xs text-signal-elevated">{error}</p>}

      {!error && (
        <>
          <section className={`rounded-xl2 ${styles.bg} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
              <span className="font-display text-lg font-semibold">{styles.label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {latest
                ? `Based on your last typing session on ${latest.domain}`
                : "No sessions recorded yet — start typing on any page"}
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Recent trend
            </h2>
            {sessions ? <PopupChart sessions={sessions} /> : <ChartSkeleton />}
          </section>

          <button
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") })}
            className="rounded-lg bg-slate-600 py-2 text-sm font-medium text-white transition hover:bg-slate-600/90"
          >
            Open full dashboard
          </button>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="text-xs text-slate-400 underline-offset-2 hover:underline"
          >
            Settings
          </button>
        </>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-16 animate-pulse rounded-lg bg-slate-100" />;
}
