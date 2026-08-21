export function nowMs(): number {
  return Date.now();
}

export function toDateKey(epochMs: number): string {
  // YYYY-MM-DD in local time, used as the report bucketing key
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(aMs: number, bMs: number): boolean {
  return toDateKey(aMs) === toDateKey(bMs);
}

export function minutesBetween(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / 60_000;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}
