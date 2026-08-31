export const SESSION_IDLE_TIMEOUT_MS = 4_000; // end a session after 60s of no keystrokes
export const PAUSE_THRESHOLD_MS = 2_000; // gap counted as a "pause" for pauseRate
export const ERROR_BURST_WINDOW_MS = 3_000; // window used to detect rapid-backspace clusters
export const MIN_KEYSTROKES_FOR_INFERENCE = 8; // don't run the model on tiny samples

export const STRESS_THRESHOLDS: Record<"low" | "medium" | "high", { steady: number; elevated: number; critical: number }> = {
  // sensitivity setting shifts thresholds left/right; "high" sensitivity
  // flags "elevated"/"critical" at lower model scores.
  low: { steady: 0.35, elevated: 0.6, critical: 0.82 },
  medium: { steady: 0.28, elevated: 0.5, critical: 0.75 },
  high: { steady: 0.2, elevated: 0.4, critical: 0.65 }
};

export const STORAGE_KEYS = {
  settings: "stress_detector_settings",
  dbName: "stress-detector-db",
  dbVersion: 1
} as const;

export const MODEL_URL = "ml/model/stress_model.onnx";
export const MODEL_META_URL = "ml/model/model_meta.json";
export const MODEL_VERSION = "2026.07.1";

export const ALARM_AGGREGATE_REPORTS = "aggregate-daily-reports";
export const ALARM_PRUNE_OLD_SESSIONS = "prune-old-sessions";

export const STRESS_LEVEL_LABELS: Record<import("./types").StressLevel, string> = {
  calm: "CALM",
  steady: "NOMINAL",
  elevated: "OVERCLOCKED",
  critical: "CYBERPSYCHO"
};

export const STRESS_LEVEL_MESSAGES: Record<import("./types").StressLevel, string> = {
  calm: "Signal's clean. Nothing to report, choom.",
  steady: "Baseline holding. Keep an eye on it.",
  elevated: "Might as well take a break.",
  critical: "You're goin cyberpsycho choom. Get off now"
};