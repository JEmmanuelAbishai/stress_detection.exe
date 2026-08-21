import * as ort from "onnxruntime-web";
import { FEATURE_ORDER, type FeatureVector, type StressLevel, type StressPrediction } from "@shared/types";
import { MODEL_VERSION, STRESS_THRESHOLDS } from "@shared/constants";
import { createLogger } from "@utils/logger";
import { toModelInputArray } from "./featureSchema";
import { loadModelMeta, loadModelSession } from "./modelLoader";
import type { UserSettings } from "@shared/types";

const log = createLogger("ml:inferenceEngine");

function standardize(input: Float32Array, mean: number[], std: number[]): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = std[i] || 1;
    out[i] = (input[i] - mean[i]) / s;
  }
  return out;
}

function scoreToLevel(score: number, sensitivity: UserSettings["sensitivity"]): StressLevel {
  const t = STRESS_THRESHOLDS[sensitivity];
  if (score >= t.critical) return "critical";
  if (score >= t.elevated) return "elevated";
  if (score >= t.steady) return "steady";
  return "calm";
}

/**
 * Rule-based fallback used only if the ONNX model fails to load (e.g. wasm
 * blocked by an enterprise policy). Deliberately conservative — it leans on
 * backspace rate and pause rate, the two signals with the clearest face
 * validity, rather than trying to approximate the trained model.
 */
function heuristicScore(features: FeatureVector): number {
  const backspaceComponent = Math.min(features.backspaceRate * 2.5, 1);
  const pauseComponent = Math.min(features.pauseRate * 1.5, 1);
  const burstComponent = Math.min(features.errorBurstRate / 10, 1);
  return Math.min(0.5 * backspaceComponent + 0.3 * pauseComponent + 0.2 * burstComponent, 1);
}

function topFeatures(
  input: Float32Array,
  weights: number[] | null
): { feature: keyof FeatureVector; weight: number }[] {
  if (!weights) return [];
  const contributions = FEATURE_ORDER.map((feature, i) => ({
    feature,
    weight: Number((input[i] * weights[i]).toFixed(4))
  }));
  return contributions.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 3);
}

export async function predictStress(
  features: FeatureVector,
  sensitivity: UserSettings["sensitivity"]
): Promise<StressPrediction> {
  const rawInput = toModelInputArray(features);

  try {
    const [session, meta] = await Promise.all([loadModelSession(), loadModelMeta()]);
    const standardized = standardize(rawInput, meta.mean, meta.std);
    const tensor = new ort.Tensor("float32", standardized, [1, standardized.length]);
    const results = await session.run({ input: tensor });

    // export_to_onnx.py exports sklearn's predict_proba as a [1, 2] tensor
    // named "score": column 0 is P(not-elevated), column 1 is P(elevated).
    // We want the positive-class probability, i.e. index 1.
    const outputTensor = results.score ?? Object.values(results)[0];
    const score = Number(outputTensor.data[1] ?? outputTensor.data[0]);

    return {
      level: scoreToLevel(score, sensitivity),
      score,
      modelVersion: MODEL_VERSION,
      computedAt: Date.now(),
      topContributingFeatures: topFeatures(standardized, null)
    };
  } catch (err) {
    log.warn("ONNX inference unavailable, using heuristic fallback.", err);
    const score = heuristicScore(features);
    return {
      level: scoreToLevel(score, sensitivity),
      score,
      modelVersion: `${MODEL_VERSION}-heuristic-fallback`,
      computedAt: Date.now(),
      topContributingFeatures: []
    };
  }
}
