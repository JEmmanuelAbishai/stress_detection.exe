/**
 * Cross-cutting type contracts. Every surface (content script, background,
 * popup, dashboard, settings, ml, storage, reports) imports from here so the
 * shape of a "typing session" or "feature vector" never drifts between
 * teammates working on different branches.
 */

export type StressLevel = "calm" | "steady" | "elevated" | "critical";

/** Order matters: this is the exact vector shape the ONNX model expects. */
export interface FeatureVector {
  avgDwellTimeMs: number;
  avgFlightTimeMs: number;
  dwellTimeStdMs: number;
  flightTimeStdMs: number;
  backspaceRate: number; // backspaces / total keystrokes
  typingSpeedCharsPerMin: number;
  pauseRate: number; // pauses > 2s / total keystrokes
  errorBurstRate: number; // rapid backspace clusters / minute
}

export const FEATURE_ORDER: (keyof FeatureVector)[] = [
  "avgDwellTimeMs",
  "avgFlightTimeMs",
  "dwellTimeStdMs",
  "flightTimeStdMs",
  "backspaceRate",
  "typingSpeedCharsPerMin",
  "pauseRate",
  "errorBurstRate"
];

export interface KeyEvent {
  key: string; // never the literal character for free-text fields; see privacy.md
  code: string;
  type: "keydown" | "keyup";
  timestamp: number; // performance.now()-based, monotonic within a session
  isBackspace: boolean;
}

export interface TypingSession {
  id: string;
  domain: string;
  tabId: number;
  startedAt: number; // epoch ms
  endedAt: number | null; // epoch ms, null while active
  keystrokeCount: number;
  features: FeatureVector | null;
  prediction: StressPrediction | null;
}

export interface StressPrediction {
  level: StressLevel;
  score: number; // 0..1 raw model output
  modelVersion: string;
  computedAt: number; // epoch ms
  topContributingFeatures: { feature: keyof FeatureVector; weight: number }[];
}

export interface DailyReport {
  date: string; // YYYY-MM-DD
  sessionCount: number;
  totalKeystrokes: number;
  avgScore: number;
  levelCounts: Record<StressLevel, number>;
  topDomains: { domain: string; sessionCount: number }[];
}

export interface UserSettings {
  detectionEnabled: boolean;
  excludedDomains: string[];
  sensitivity: "low" | "medium" | "high"; // maps to score thresholds
  captureKeyIdentity: boolean; // if false, only timing is recorded, never the key
  notifyOnElevated: boolean;
  retentionDays: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  detectionEnabled: true,
  excludedDomains: [],
  sensitivity: "medium",
  captureKeyIdentity: false,
  notifyOnElevated: true,
  retentionDays: 30
};