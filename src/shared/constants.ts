/** A "pause" is any inter-key flight time longer than this (ms). */
export const PAUSE_THRESHOLD_MS = 500;

/** Two+ backspaces within this window count as one error burst (ms). */
export const ERROR_BURST_WINDOW_MS = 3000;

/** A session needs at least this many keystrokes before it's worth analyzing. */
export const MIN_KEYSTROKES = 5;

/** The current content-script session is flushed after this much idle time. */
export const SESSION_IDLE_MS = 30_000;

export const MIN_KEYSTROKES_FOR_INFERENCE = 10;

export const SESSION_IDLE_TIMEOUT_MS = 30_000;