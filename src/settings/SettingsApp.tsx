import { useEffect, useState } from "react";
import type { UserSettings } from "@shared/types";
import { DEFAULT_SETTINGS } from "@shared/types";
import { sendMessage } from "@shared/messages";
import { SUGGESTED_EXCLUSIONS } from "@utils/domain";

export function SettingsApp() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [newDomain, setNewDomain] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const res = await sendMessage({ type: "GET_SETTINGS" });
    if (res.ok && "settings" in res) setSettings(res.settings);
  }

  async function save(patch: Partial<UserSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await sendMessage({ type: "UPDATE_SETTINGS", settings: patch });
    setSavedAt(Date.now());
  }

  function addExcludedDomain(domain: string) {
    const clean = domain.trim().toLowerCase();
    if (!clean || settings.excludedDomains.includes(clean)) return;
    void save({ excludedDomains: [...settings.excludedDomains, clean] });
    setNewDomain("");
  }

  function removeExcludedDomain(domain: string) {
    void save({ excludedDomains: settings.excludedDomains.filter((d) => d !== domain) });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-400">
          Everything here is stored only on this device.{" "}
          {savedAt && <span className="text-signal-calm">Saved</span>}
        </p>
      </header>

      <section className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold">Enable stress detection</h2>
            <p className="text-xs text-slate-400">Turns off keystroke timing capture entirely when disabled.</p>
          </div>
          <Toggle checked={settings.detectionEnabled} onChange={(v) => save({ detectionEnabled: v })} />
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="mb-1 font-display text-sm font-semibold">Sensitivity</h2>
        <p className="mb-3 text-xs text-slate-400">
          Higher sensitivity flags "elevated" and "critical" at lower model scores.
        </p>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((level) => (
            <button
              key={level}
              onClick={() => save({ sensitivity: level })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${
                settings.sensitivity === level
                  ? "bg-slate-600 text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="card mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold">Capture key identity</h2>
            <p className="text-xs text-slate-400">
              Off by default. Only timing (not which key) is used for detection either way.
            </p>
          </div>
          <Toggle checked={settings.captureKeyIdentity} onChange={(v) => save({ captureKeyIdentity: v })} />
        </div>
      </section>

      <section className="card mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold">Notify on elevated stress</h2>
          </div>
          <Toggle checked={settings.notifyOnElevated} onChange={(v) => save({ notifyOnElevated: v })} />
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="mb-1 font-display text-sm font-semibold">Excluded sites</h2>
        <p className="mb-3 text-xs text-slate-400">
          Typing on these domains is never captured or analyzed.
        </p>

        <div className="mb-3 flex gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExcludedDomain(newDomain)}
            placeholder="example.com"
            className="flex-1 rounded-lg border border-slate-100 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          <button
            onClick={() => addExcludedDomain(newDomain)}
            className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600/90"
          >
            Add
          </button>
        </div>

        <ul className="mb-3 flex flex-wrap gap-2">
          {settings.excludedDomains.map((domain) => (
            <li
              key={domain}
              className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600"
            >
              {domain}
              <button onClick={() => removeExcludedDomain(domain)} className="text-slate-400 hover:text-signal-critical">
                ×
              </button>
            </li>
          ))}
        </ul>

        <p className="mb-2 text-xs text-slate-400">Suggested (banking / health / auth sites):</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_EXCLUSIONS.filter((d) => !settings.excludedDomains.includes(d)).map((domain) => (
            <button
              key={domain}
              onClick={() => addExcludedDomain(domain)}
              className="rounded-full border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-600"
            >
              + {domain}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-1 font-display text-sm font-semibold">Data retention</h2>
        <p className="mb-3 text-xs text-slate-400">
          Sessions older than this are automatically deleted.
        </p>
        <input
          type="range"
          min={7}
          max={90}
          step={1}
          value={settings.retentionDays}
          onChange={(e) => save({ retentionDays: Number(e.target.value) })}
          className="w-full"
        />
        <p className="text-sm text-slate-500">{settings.retentionDays} days</p>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-signal-calm" : "bg-slate-100"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
