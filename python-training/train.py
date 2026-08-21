"""
train.py
Trains a stress classifier on typing-session features and saves:
  - checkpoints/model.joblib          (sklearn pipeline, for inspection/retraining)
  - checkpoints/model_meta.json       (feature order + standardization stats)

Run export_to_onnx.py afterward to produce the artifact the extension
actually loads (src/ml/model/stress_model.onnx + model_meta.json).

Usage:
    python train.py --data data/typing_sessions.csv
"""

import argparse
import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from preprocess import FEATURE_ORDER, generate_synthetic_dataset

CHECKPOINT_DIR = "checkpoints"


def load_dataset(path: str) -> pd.DataFrame:
    if os.path.exists(path):
        return pd.read_csv(path)
    print(f"{path} not found — generating a fresh synthetic dataset instead.")
    return generate_synthetic_dataset()


def main(data_path: str) -> None:
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    df = load_dataset(data_path)

    X = df[FEATURE_ORDER].to_numpy(dtype=np.float32)
    y = df["label"].to_numpy(dtype=np.int32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Logistic regression rather than a larger ensemble: this model runs
    # client-side via ONNX Runtime Web on every session end, so we favor a
    # small, fast, and interpretable model (coefficients map directly to
    # topContributingFeatures in inferenceEngine.ts) over marginal AUC gains.
    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    print(classification_report(y_test, y_pred, target_names=["not-elevated", "elevated"]))
    print(f"ROC AUC: {roc_auc_score(y_test, y_proba):.3f}")

    joblib.dump({"model": model, "scaler": scaler}, os.path.join(CHECKPOINT_DIR, "model.joblib"))

    meta = {
        "version": "2026.07.1",
        "featureOrder": FEATURE_ORDER,
        "mean": scaler.mean_.tolist(),
        "std": scaler.scale_.tolist(),
        "classes": ["calm", "steady", "elevated", "critical"],
    }
    with open(os.path.join(CHECKPOINT_DIR, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved model + metadata to {CHECKPOINT_DIR}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/typing_sessions.csv")
    args = parser.parse_args()
    main(args.data)
