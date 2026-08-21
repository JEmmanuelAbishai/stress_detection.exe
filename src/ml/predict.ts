import type { FeatureVector, StressLevel, StressPrediction, UserSettings } from "@shared/types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * On-device stress classifier. Uses a deterministic heuristic weighted by the
 * documented typing stress signals (dwell/flight time, backspace rate, pauses,
 * error bursts). When a trained ONNX model is available this same signature
 * can be swapped for model inference without touching callers.
 *
 * "Higher sensitivity flags elevated/critical at lower model scores" — so the
 * low/medium/high settings shift the band boundaries down.
 */
export function predictStress(
  features: FeatureVector,
  sensitivity: UserSettings["sensitivity"] = "medium"
): StressPrediction {
  const dwell = clamp01((features.avgDwellTimeMs - 60) / 120);
  const flight = clamp01((features.avgFlightTimeMs - 100) / 250);
  const backspace = clamp01(features.backspaceRate / 0.15);
  const pause = clamp01(features.pauseRate / 0.2);
  const burst = clamp01(features.errorBurstRate / 3);

  const score = clamp01(dwell * 0.25 + flight * 0.25 + backspace * 0.2 + pause * 0.15 + burst * 0.15);

  const bands: Record<UserSettings["sensitivity"], [number, number, number]> = {
    low: [0.35, 0.55, 0.75],
    medium: [0.3, 0.5, 0.7],
    high: [0.25, 0.45, 0.65]
  };
  const [calmCut, steadyCut, elevatedCut] = bands[sensitivity];

  const level: StressLevel =
    score < calmCut
      ? "calm"
      : score < steadyCut
        ? "steady"
        : score < elevatedCut
          ? "elevated"
          : "critical";

  return { level, score: Number(score.toFixed(3)) };
}