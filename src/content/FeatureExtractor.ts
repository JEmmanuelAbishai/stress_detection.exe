import type { FeatureVector, KeyEvent } from "@shared/types";
import { ERROR_BURST_WINDOW_MS, PAUSE_THRESHOLD_MS } from "@shared/constants";

interface KeyDownRecord {
  timestamp: number;
  isBackspace: boolean;
}

/**
 * Rolling buffer of key events -> derived FeatureVector.
 * Dwell time  = keyup.timestamp - keydown.timestamp for the SAME physical key
 * Flight time = next keydown.timestamp - previous keyup.timestamp
 */
export class FeatureExtractor {
  private downTimestamps = new Map<string, number>(); // code -> keydown timestamp
  private dwellTimes: number[] = [];
  private flightTimes: number[] = [];
  private lastKeyUpAt: number | null = null;
  private keyLog: KeyDownRecord[] = [];
  private totalKeystrokes = 0;
  private backspaceCount = 0;
  private pauseCount = 0;
  private errorBurstEvents: number[] = [];

  ingest(event: KeyEvent): void {
    if (event.type === "keydown") {
      this.handleKeyDown(event);
    } else {
      this.handleKeyUp(event);
    }
  }

  private handleKeyDown(event: KeyEvent): void {
    this.downTimestamps.set(event.code, event.timestamp);
    this.totalKeystrokes += 1;
    if (event.isBackspace) {
      this.backspaceCount += 1;
      this.errorBurstEvents.push(event.timestamp);
    }

    if (this.lastKeyUpAt !== null) {
      const flight = event.timestamp - this.lastKeyUpAt;
      if (flight >= 0) {
        this.flightTimes.push(flight);
        if (flight > PAUSE_THRESHOLD_MS) this.pauseCount += 1;
      }
    }

    this.keyLog.push({ timestamp: event.timestamp, isBackspace: event.isBackspace });
  }

  private handleKeyUp(event: KeyEvent): void {
    const downAt = this.downTimestamps.get(event.code);
    if (downAt !== undefined) {
      const dwell = event.timestamp - downAt;
      if (dwell >= 0 && dwell < 5_000) this.dwellTimes.push(dwell);
      this.downTimestamps.delete(event.code);
    }
    this.lastKeyUpAt = event.timestamp;
  }

  private countErrorBursts(): number {
    // a "burst" = 2+ backspaces within ERROR_BURST_WINDOW_MS of each other
    let bursts = 0;
    let i = 0;
    while (i < this.errorBurstEvents.length) {
      let j = i;
      while (
        j + 1 < this.errorBurstEvents.length &&
        this.errorBurstEvents[j + 1] - this.errorBurstEvents[i] <= ERROR_BURST_WINDOW_MS
      ) {
        j += 1;
      }
      if (j > i) bursts += 1;
      i = j + 1;
    }
    return bursts;
  }

  hasEnoughData(minKeystrokes: number): boolean {
    return this.totalKeystrokes >= minKeystrokes;
  }

  /** Builds the feature vector for everything ingested since the last reset. */
  extract(sessionDurationMs: number): FeatureVector {
    const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const std = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };

    const durationMin = Math.max(sessionDurationMs / 60_000, 1 / 60);
    const errorBursts = this.countErrorBursts();

    return {
      avgDwellTimeMs: mean(this.dwellTimes),
      avgFlightTimeMs: mean(this.flightTimes),
      dwellTimeStdMs: std(this.dwellTimes),
      flightTimeStdMs: std(this.flightTimes),
      backspaceRate: this.totalKeystrokes ? this.backspaceCount / this.totalKeystrokes : 0,
      typingSpeedCharsPerMin: this.totalKeystrokes / durationMin,
      pauseRate: this.totalKeystrokes ? this.pauseCount / this.totalKeystrokes : 0,
      errorBurstRate: errorBursts / durationMin
    };
  }

  reset(): void {
    this.downTimestamps.clear();
    this.dwellTimes = [];
    this.flightTimes = [];
    this.lastKeyUpAt = null;
    this.keyLog = [];
    this.totalKeystrokes = 0;
    this.backspaceCount = 0;
    this.pauseCount = 0;
    this.errorBurstEvents = [];
  }

  get keystrokeCount(): number {
    return this.totalKeystrokes;
  }
}
