# Architecture

## Overview

```
 ┌──────────────┐   keystroke timing    ┌──────────────────┐
 │ content/     │ ─────────────────────▶│ background/       │
 │ (per tab)    │   feature vectors      │ (service worker)  │
 └──────────────┘                        │                    │
                                          │  ┌──────────────┐  │
                                          │  │ ml/          │  │
                                          │  │ (ONNX infer) │  │
                                          │  └──────────────┘  │
                                          │  ┌──────────────┐  │
                                          │  │ storage/     │  │
                                          │  │ (IndexedDB + │  │
                                          │  │ chrome.storage)│ │
                                          │  └──────────────┘  │
                                          └─────────┬──────────┘
                                                     │ chrome.runtime messages
                              ┌──────────────────────┼───────────────────────┐
                              ▼                      ▼                       ▼
                      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
                      │ popup/        │      │ dashboard/    │      │ settings/     │
                      │ quick glance  │      │ trends/reports│      │ preferences   │
                      └───────────────┘      └───────────────┘      └───────────────┘
```

## Why a service-worker-centric design

Manifest V3 content scripts are short-lived and per-tab, so they should not
own persistence or inference. Instead:

- **`content/`** only listens for keystrokes, extracts a `FeatureVector`
  locally (see `content/featureExtractor.ts`), and sends it to the background
  once a session ends. It never talks to storage or the ML model directly.
- **`background/`** is the single source of truth. It owns the ONNX
  inference session, IndexedDB, chrome.storage, alarms, and notifications.
  All three UI surfaces (`popup/`, `dashboard/`, `settings/`) talk to it
  exclusively through the typed message protocol in `shared/messages.ts`.
- **`ml/`** is intentionally UI-agnostic: `inferenceEngine.ts` takes a
  `FeatureVector` and returns a `StressPrediction`, nothing more. It can be
  unit-tested without any Chrome APIs (see `tests/unit`).

## Data flow for a single typing session

1. User types on a page → `content/keystrokeListener.ts` captures raw
   `keydown`/`keyup` timing (never the actual key, unless
   `captureKeyIdentity` is explicitly turned on in Settings).
2. `content/featureExtractor.ts` incrementally builds dwell/flight time
   statistics as events arrive.
3. After `SESSION_IDLE_TIMEOUT_MS` of inactivity (or `beforeunload`),
   `content/sessionTracker.ts` finalizes a `FeatureVector` and sends
   `SESSION_FEATURES_READY` to the background.
4. `background/messageRouter.ts` calls `ml/inferenceEngine.ts`, which
   standardizes the vector using `model_meta.json` stats and runs it through
   `stress_model.onnx` via `onnxruntime-web`.
5. The resulting `StressPrediction` + `FeatureVector` are persisted as a
   `TypingSession` in IndexedDB (`storage/sessionsRepo.ts`).
6. `background/alarms.ts` periodically rolls sessions up into `DailyReport`s
   (`reports/reportBuilder.ts`) for fast dashboard rendering, and prunes
   sessions older than the user's retention window.
7. `popup/`, `dashboard/`, and `settings/` each independently query the
   background for whatever slice of data they need, on mount.

## Model lifecycle

`python-training/` is a standalone Python project, not part of the Vite/TS
build. It trains a small `LogisticRegression` (see `train.py`) and exports it
to ONNX (`export_to_onnx.py`), writing directly into `src/ml/model/`. See
`python-training/README.md` for the full pipeline and
`ml/featureSchema.ts` for the contract both sides must agree on.

## Team ↔ code-ownership mapping

| Member                    | Owns                                             |
| -------------------------- | ------------------------------------------------- |
| UI                          | `popup/`, `dashboard/`, `settings/`, Tailwind config |
| Typing Engine               | `content/`                                         |
| ML                          | `ml/`, `python-training/`                          |
| Storage / Reports           | `storage/`, `reports/`                             |
| Fullstack                   | `background/`, `shared/`, build config, CI          |

`shared/` is the one directory everyone imports from and no single person
"owns" — changes there should be reviewed by whoever's work depends on them.
