import { useEffect, useState } from "react";
import type { StressLevel, TypingSession, UserSettings } from "@shared/types";
import { sendMessage } from "@shared/messages";
import { STRESS_LEVEL_LABELS } from "@shared/constants";
import { PopupChart } from "./popupChart";

const LEVEL_STYLES: Record<StressLevel, { dot: string; bg: string }> = {
  calm: { dot: "bg-signal-calm", bg: "bg-signal-calm/10" },
  steady: { dot: "bg-signal-steady", bg: "bg-signal-steady/10" },
  elevated: { dot: "bg-signal-elevated", bg: "bg-signal-elevated/10" },
  critical: { dot: "bg-signal-critical", bg: "bg-signal-critical/10" }
};

export function PopupApp() {
  const [sessions, setSessions] = useState<TypingSession[] | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

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
  const label = STRESS_LEVEL_LABELS[level];

  return (
    <div className="flex flex-col gap-4 bg-black p-4 text-cyan font-body">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-sm font-bold uppercase tracking-widest text-neonYellow neon-text">
            Stress Detector
          </h1>
          <p className="text-xs text-cyan/60 font-mono">// local, on-device scan</p>
        </div>
        <button
          onClick={toggleDetection}
          className={`rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wide transition ${
            settings?.detectionEnabled
              ? "bg-signal-calm/15 text-signal-calm"
              : "bg-cyan/10 text-cyan/40"
          }`}
        >
          {settings?.detectionEnabled ? "On" : "Off"}
        </button>
      </header>

      {error && <p className="rounded-lg bg-signal-elevated/10 p-2 text-xs text-signal-elevated">{error}</p>}

      {!error && (
        <>
          <section className={`rounded-lg border border-current/30 ${styles.bg} p-4 neon-border`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} shadow-neon`} />
              <span className="font-display text-lg font-bold uppercase tracking-wide neon-text">{label}</span>
            </div>
            <p className="mt-1 text-xs text-cyan/50 font-mono">
              {latest
                ? `Based on your last typing session on ${latest.domain}`
                : "No sessions recorded yet — start typing on any page"}
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-xs font-mono uppercase tracking-widest text-cyan/40">
              Recent trend
            </h2>
            {sessions ? <PopupChart sessions={sessions} /> : <ChartSkeleton />}
          </section>

          <button
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") })}
            className="rounded-lg border border-neonYellow py-2 text-sm font-display uppercase tracking-wide text-neonYellow transition hover:bg-neonYellow hover:text-black hover:shadow-neon"
          >
            Open full dashboard
          </button>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="text-xs text-cyan/40 underline-offset-2 hover:text-cyan hover:underline"
          >
            Settings
          </button>
        </>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-16 animate-pulse rounded-lg bg-cyan/10" />;
}