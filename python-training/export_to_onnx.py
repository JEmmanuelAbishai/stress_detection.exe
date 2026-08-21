"""
export_to_onnx.py
Bridge step: converts the trained sklearn LogisticRegression
(checkpoints/model.joblib) into an ONNX graph the extension can run fully
client-side via onnxruntime-web, and copies the resulting artifacts into
src/ml/model/ where inferenceEngine.ts / modelLoader.ts expect them.

The ONNX graph's probability output is renamed to "score", a [N, 2] tensor
where column 0 is P(not-elevated) and column 1 is P(elevated) — the JS side
(inferenceEngine.ts) reads column 1 as the stress score in [0, 1].

Usage:
    python export_to_onnx.py
"""

import json
import os
import shutil

import joblib
import numpy as np
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType

CHECKPOINT_DIR = "checkpoints"
OUTPUT_DIR = os.path.join("..", "src", "ml", "model")


def main() -> None:
    bundle = joblib.load(os.path.join(CHECKPOINT_DIR, "model.joblib"))
    model = bundle["model"]

    n_features = len(model.coef_[0])
    initial_type = [("input", FloatTensorType([None, n_features]))]

    onnx_model = to_onnx(
        model,
        initial_types=initial_type,
        target_opset=15,
        options={id(model): {"zipmap": False}},
    )

    # sklearn-onnx names the probability output "probabilities" by default;
    # rename to "score" and keep only the positive-class column so the JS
    # side can read a single scalar per sample.
    for output in onnx_model.graph.output:
        if output.name == "probabilities":
            output.name = "score"
    for node in onnx_model.graph.node:
        for i, name in enumerate(node.output):
            if name == "probabilities":
                node.output[i] = "score"

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    onnx_path = os.path.join(OUTPUT_DIR, "stress_model.onnx")
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    with open(os.path.join(CHECKPOINT_DIR, "model_meta.json")) as f:
        meta = json.load(f)
    shutil.copyfile(
        os.path.join(CHECKPOINT_DIR, "model_meta.json"),
        os.path.join(OUTPUT_DIR, "model_meta.json"),
    )

    print(f"Wrote {onnx_path}")
    print(f"Wrote {os.path.join(OUTPUT_DIR, 'model_meta.json')} (version {meta['version']})")


if __name__ == "__main__":
    main()
