# Privacy

This extension captures **keystroke timing**, not keystroke **content**, in
order to estimate typing-behavior stress signals. This document exists
because that distinction matters and should never be assumed — it should be
verifiable by reading the code referenced below.

## What is captured

By default (`captureKeyIdentity: false` in `UserSettings`):

- Timestamps of `keydown` / `keyup` events (`content/keystrokeListener.ts`)
- Whether a key was Backspace/Delete (needed for `backspaceRate`)
- Derived aggregate statistics only: average/std dwell time, average/std
  flight time, backspace rate, typing speed, pause rate, error-burst rate
  (`content/featureExtractor.ts`, `shared/types.ts#FeatureVector`)

**The actual character typed is never read, stored, or transmitted** unless
a user explicitly enables `captureKeyIdentity` in Settings — and even then,
identity is only used locally in-memory for the raw event; it is never part
of the `FeatureVector` that gets persisted or sent anywhere (see
`FEATURE_ORDER` in `shared/types.ts` — there is no "which key" field).

## Where data goes

- Everything stays **on-device**. `storage/db.ts` uses IndexedDB;
  `storage/settingsRepo.ts` uses `chrome.storage.local`. Neither is synced to
  any server by this codebase.
- ONNX inference (`ml/inferenceEngine.ts`) runs fully client-side via
  `onnxruntime-web` (WASM) — no network call is made to classify a session.
- The only way data leaves the device is an explicit, user-initiated
  `REQUEST_EXPORT` (CSV/PDF) that the user themselves downloads and shares
  with whoever they choose.

## User controls (`settings/SettingsApp.tsx`)

- **Enable/disable detection entirely** — when off, no listeners attach.
- **Excluded sites** — domains (e.g. banking, health, auth) where nothing is
  ever captured. A suggested starter list ships in `utils/domain.ts`, and
  users can add/remove freely.
- **Data retention** — sessions older than the configured window (default 30
  days) are deleted automatically by `background/alarms.ts`.
- **Sensitivity** — does not change what's captured, only how raw model
  scores map to displayed stress levels.

## For anyone extending this project

If you add a feature that would read message content, page text, form
values, or anything beyond keystroke *timing*, treat that as a significant
scope change requiring its own privacy review and explicit, separate user
consent — do not fold it into the existing `detectionEnabled` toggle.

If you build a "research mode" data-export/upload feature for improving the
shared model (see `python-training/README.md`), it must be opt-in, clearly
disclosed, and should exclude `excludedDomains` sessions by construction,
not just by convention.
