import * as ort from "onnxruntime-web";
import { MODEL_META_URL, MODEL_URL } from "@shared/constants";
import { createLogger } from "@utils/logger";
import type { ModelMeta } from "./featureSchema";

const log = createLogger("ml:modelLoader");

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let metaPromise: Promise<ModelMeta> | null = null;

/**
 * Lazily loads and memoizes the ONNX inference session. onnxruntime-web needs
 * its .wasm assets reachable at runtime — vite.config.ts copies them into
 * dist/ alongside background.js/content.js so this resolves under both the
 * extension page context and (if ever used) a content-script context.
 */
export function loadModelSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    const modelUrl = chrome.runtime.getURL(MODEL_URL);
    sessionPromise = ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"]
    }).catch((err) => {
      log.error("Failed to load ONNX model, inference will fall back to heuristic scoring.", err);
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

export async function loadModelMeta(): Promise<ModelMeta> {
  if (!metaPromise) {
    const metaUrl = chrome.runtime.getURL(MODEL_META_URL);
    metaPromise = fetch(metaUrl).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch model metadata: ${res.status}`);
      return res.json() as Promise<ModelMeta>;
    });
  }
  return metaPromise;
}
