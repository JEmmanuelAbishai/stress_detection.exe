import { FEATURE_ORDER, type FeatureVector } from "@shared/types";

/**
 * SOURCE OF TRUTH for the model's input contract. python-training/preprocess.py
 * must produce columns in this exact order when training, and
 * export_to_onnx.py bakes that order into model_meta.json so this file and
 * the trained model can never silently drift apart.
 *
 * If you add/remove/reorder a feature:
 *   1. Update FeatureVector + FEATURE_ORDER in src/shared/types.ts
 *   2. Update python-training/preprocess.py to match
 *   3. Retrain + re-export (python-training/train.py, export_to_onnx.py)
 *   4. Bump MODEL_VERSION in src/shared/constants.ts
 */
export function toModelInputArray(features: FeatureVector): Float32Array {
  return Float32Array.from(FEATURE_ORDER.map((key) => features[key]));
}

export interface ModelMeta {
  version: string;
  featureOrder: (keyof FeatureVector)[];
  mean: number[]; // per-feature mean used for standardization at train time
  std: number[]; // per-feature std used for standardization at train time
  classes: ["calm", "steady", "elevated", "critical"];
}
