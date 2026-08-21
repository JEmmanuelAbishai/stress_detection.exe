import { KeystrokeListener } from "./KeyStrokeListener";
import { FeatureExtractor } from "./FeatureExtractor";
import { predictStress } from "@ml/predict";
import { MIN_KEYSTROKES, SESSION_IDLE_MS } from "@shared/constants";
import { sendMessage } from "@shared/messages";
import { normalizeDomain } from "@utils/domain";
import type { TypingSession, UserSettings } from "@shared/types";

/**
 * Content-script entry: captures keystroke timing on the current page, groups
 * it into sessions, derives a FeatureVector and stress prediction, then hands
 * the finished session to the background worker for storage.
 *
 * Settings are read once at document_idle; toggling detection or exclusions
 * applies to pages loaded afterwards.
 */

const listener = new KeystrokeListener();
const extractor = new FeatureExtractor();

let settings: UserSettings | null = null;
let active = false;
let startedAt = 0;
let idleTimer: number | undefined;

listener.on((event) => {
  if (!settings?.detectionEnabled) return;
  if (!active) {
    extractor.reset();
    active = true;
    startedAt = Date.now();
  }
  extractor.ingest(event);
  scheduleIdleFlush();
});

function scheduleIdleFlush(): void {
  if (idleTimer !== undefined) window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    void flushSession();
  }, SESSION_IDLE_MS);
}

function isExcludedDomain(): boolean {
  if (!settings) return false;
  const host = normalizeDomain(location.hostname);
  return settings.excludedDomains.some((d) => host === d || host.endsWith(`.${d}`));
}

async function flushSession(): Promise<void> {
  if (idleTimer !== undefined) window.clearTimeout(idleTimer);
  idleTimer = undefined;
  if (!active) return;
  active = false;

  if (!extractor.hasEnoughData(MIN_KEYSTROKES)) {
    extractor.reset();
    return;
  }

  const endedAt = Date.now();
  const features = extractor.extract(endedAt - startedAt);
  const prediction = predictStress(features, settings?.sensitivity ?? "medium");

  const session: TypingSession = {
    id: randomId(),
    domain: location.hostname,
    startedAt,
    endedAt,
    featureVector: features,
    prediction
  };

  try {
    await sendMessage({ type: "ADD_SESSION", session });
  } catch (err) {
    console.error("stress-detector: failed to store session", err);
  }
  extractor.reset();
}

function randomId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function loadSettings(): Promise<void> {
  try {
    const res = await sendMessage({ type: "GET_SETTINGS" });
    if (res.ok && "settings" in res) settings = res.settings;
  } catch (err) {
    console.error("stress-detector: failed to load settings", err);
  }
}

function attachDomListeners(): void {
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    listener.dispatch({
      type: "keydown",
      code: e.code,
      timestamp: e.timeStamp,
      isBackspace: e.code === "Backspace"
    });
  });
  window.addEventListener("keyup", (e) => {
    listener.dispatch({
      type: "keyup",
      code: e.code,
      timestamp: e.timeStamp,
      isBackspace: e.code === "Backspace"
    });
  });
  window.addEventListener("blur", () => {
    void flushSession();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushSession();
  });
}

async function main(): Promise<void> {
  await loadSettings();
  if (!settings?.detectionEnabled || isExcludedDomain()) return;
  attachDomListeners();
}

void main();