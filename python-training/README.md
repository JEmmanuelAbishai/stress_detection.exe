# python-training

Model-training pipeline for the Typing Stress Detector. Kept **outside** `src/`
so it is never picked up by the Vite/TypeScript build — it's a separate,
Python-only project that produces one artifact the extension consumes:
`src/ml/model/stress_model.onnx` + `src/ml/model/model_meta.json`.

## Pipeline

```
preprocess.py  →  data/typing_sessions.csv
train.py       →  checkpoints/model.joblib, checkpoints/model_meta.json
export_to_onnx.py → ../src/ml/model/stress_model.onnx, ../src/ml/model/model_meta.json
```

## Quickstart

```bash
cd python-training
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python preprocess.py          # generates a synthetic dataset (swap for real, consented data later)
python train.py --data data/typing_sessions.csv
python export_to_onnx.py      # writes into src/ml/model/
```

## Notes

- `preprocess.py`'s `generate_synthetic_dataset()` exists so the pipeline runs
  end-to-end without real user data. Real training data should come only from
  the extension's opt-in research-mode export (see `../docs/privacy.md`) —
  never from silently captured keystrokes.
- `FEATURE_ORDER` in `preprocess.py` **must** stay in sync with
  `FEATURE_ORDER` in `../src/shared/types.ts` and `../src/ml/featureSchema.ts`.
  If you add/remove a feature, update all three and bump `MODEL_VERSION` in
  `../src/shared/constants.ts`.
- The exported ONNX model is intentionally a small logistic regression, not a
  large ensemble — it needs to run fast, client-side, on every session end via
  `onnxruntime-web`, and its coefficients are used to populate
  `topContributingFeatures` for the dashboard's explainability panel.
