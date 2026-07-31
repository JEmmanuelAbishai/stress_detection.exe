# Typing Stress Detector

A Chrome extension that estimates typing-behavior stress signals (dwell
time, flight time, backspace rate, pauses) entirely **on-device**, and shows
trends in a private popup + dashboard. Built with React, TypeScript,
TailwindCSS, and a small Python/scikit-learn/ONNX model that runs client-side
via `onnxruntime-web`.

See `docs/privacy.md` before running this on your own machine — it explains
exactly what is and isn't captured.

## Stack

- **Extension**: Manifest V3, React 18, TypeScript, TailwindCSS, Vite
- **ML runtime**: ONNX Runtime Web (WASM) — inference happens fully
  client-side, no server round-trip
- **ML training**: Python, scikit-learn, `skl2onnx` (see `python-training/`)
- **Storage**: IndexedDB (sessions/reports) + `chrome.storage.local`
  (settings)

## Project layout

```
manifest.json, vite.config.ts, tailwind.config.js  — extension + build config
src/popup/        — toolbar popup (quick glance + trend sparkline)
src/dashboard/     — full trends dashboard (charts, exports)
src/settings/      — preferences (sensitivity, exclusions, retention)
src/background/    — service worker: message router, alarms, notifications
src/content/       — per-page keystroke listener + feature extraction
src/ml/            — ONNX model loading + inference
src/storage/       — IndexedDB + chrome.storage repositories
src/reports/       — daily report aggregation + CSV/PDF export
src/shared/        — cross-cutting types, message protocol, constants
src/utils/         — time/logging/domain helpers
python-training/    — standalone Python pipeline that produces the ONNX model
docs/               — architecture, message protocol, privacy
tests/              — unit (vitest), integration (vitest + chrome mocks), e2e (playwright)
```

See `docs/architecture.md` for the full data-flow diagram and
`docs/message-protocol.md` for the typed message contract every surface uses
to talk to the background service worker.

## Getting started

```bash
npm install
npm run build          # outputs the loadable extension to dist/
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load
unpacked** → select the `dist/` folder.

For active development:

```bash
npm run dev             # rebuilds on change; reload the extension in Chrome after each build
```

### Retraining the model

The shipped `src/ml/model/stress_model.onnx` is trained on a synthetic
dataset (see `python-training/preprocess.py`) so the pipeline is runnable
without any real user data. To retrain:

```bash
cd python-training
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python preprocess.py
python train.py --data data/typing_sessions.csv
python export_to_onnx.py   # writes into ../src/ml/model/
```

## Testing

```bash
npm run test             # unit + integration (vitest)
npm run build && npm run test:e2e   # e2e (playwright, requires a built dist/)
```

## Team workflow

This repo is organized around five branches feeding into `develop`:
`ui`, `typing-engine`, `ml-model`, `storage-services`, plus whoever's doing
full-stack/background + build work directly on `develop`. See
`docs/architecture.md#team--code-ownership-mapping` for which folders map to
which branch, and treat `src/shared/` as commonly-owned — changes there
should be reviewed by whoever depends on them before merging to `develop`.

## License

See `LICENSE`.
