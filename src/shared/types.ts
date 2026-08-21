/** Cross-cutting domain types shared by every surface (popup, dashboard,
 * settings, content script, background worker). This file is commonly owned:
 * changes ripple into all consumers, so review them before merging. */

/** Four-band stress level shown across the UI. */
export type StressLevel = "calm" | "steady" | "elevated" | "critical";

/** A normalized 0..1 stress score plus the band it maps to. */
export interface StressPrediction {
  level: StressLevel;
  score: number;
}

/** Content-script view of a single keystroke (timing + backspace only). */
export interface KeyEvent {
  type: "keydown" | "keyup";
  /** Physical DOM KeyboardEvent.code — used only to pair keydown/keyup for dwell time. */
  code: string;
  timestamp: number;
  isBackspace: boolean;
}

/** Derived, aggregate typing metrics for one session. */
export interface FeatureVector {
  avgDwellTimeMs: number;
  avgFlightTimeMs: number;
  dwellTimeStdMs: number;
  flightTimeStdMs: number;
  backspaceRate: number;
  typingSpeedCharsPerMin: number;
  pauseRate: number;
  errorBurstRate: number;
}

/** One captured typing session, stored by the background worker. */
export interface TypingSession {
  id: string;
  domain: string;
  startedAt: number;
  endedAt: number;
  featureVector: FeatureVector;
  prediction: StressPrediction;
}

/** Settings the user can edit in src/settings. */
export interface UserSettings {
  detectionEnabled: boolean;
  sensitivity: "low" | "medium" | "high";
  captureKeyIdentity: boolean;
  notifyOnElevated: boolean;
  excludedDomains: string[];
  retentionDays: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  detectionEnabled: true,
  sensitivity: "medium",
  captureKeyIdentity: false,
  notifyOnElevated: true,
  excludedDomains: [],
  retentionDays: 30
};

/** Counts of sessions in each stress band. */
export interface LevelCounts {
  calm: number;
  steady: number;
  elevated: number;
  critical: number;
}

/** Per-calendar-day rollup used by the dashboard trend + stacked charts. */
export interface DailyReport {
  /** YYYY-MM-DD */
  date: string;
  /** 0..1 mean of the day's stress scores. */
  avgScore: number;
  levelCounts: LevelCounts;
  sessionCount: number;
  totalKeystrokes: number;
}