# Message protocol

All cross-context communication goes through `chrome.runtime.sendMessage` /
`chrome.runtime.onMessage`, typed via `src/shared/messages.ts`. Never add an
ad-hoc untyped message — extend `ExtensionMessage` / `ExtensionResponse`
instead, so every branch's changes stay compatible.

## Messages

| Type                     | Sent by            | Handled by            | Purpose                                       |
| ------------------------- | ------------------- | ----------------------- | ------------------------------------------------ |
| `SESSION_STARTED`          | content              | background              | Registers a new in-progress session for a tab.   |
| `SESSION_FEATURES_READY`   | content              | background              | Delivers a finalized `FeatureVector`; triggers inference + persistence. |
| `SESSION_ENDED`            | content              | background              | Clears the in-memory active-session entry for a tab. |
| `GET_ACTIVE_SESSION`       | popup                | background              | Reads the in-progress session for a given tab.   |
| `GET_RECENT_SESSIONS`      | popup, dashboard     | background              | Reads the N most recent completed sessions.      |
| `GET_SETTINGS`             | content, popup, settings, dashboard | background | Reads current `UserSettings`.                    |
| `UPDATE_SETTINGS`          | popup, settings       | background              | Patches `UserSettings` (partial update).         |
| `REQUEST_EXPORT`           | dashboard             | background              | Triggers a CSV or PDF download for a date range. |

## Conventions

- Every message has a `type` string literal discriminant — this lets
  `messageRouter.ts`'s `switch` narrow types without casts, and the
  `default` branch's `never` check means TypeScript will fail to compile if
  a new message type is added without being handled.
- Responses always have an `ok: boolean` discriminant. `ok: false` responses
  carry an `error: string` — callers should surface this to the user rather
  than silently swallowing it (see `PopupApp.tsx`'s `error` state for the
  pattern).
- The background service worker is the only context allowed to touch
  IndexedDB (`storage/`) or run ONNX inference (`ml/`). If you're tempted to
  import `storage/` or `ml/` directly from `popup/`, `dashboard/`, or
  `content/`, send a message instead — this keeps a single writer for all
  persisted state and avoids IndexedDB version-conflict bugs across
  contexts.
- `sendMessage<T>()` in `shared/messages.ts` wraps the callback-based
  `chrome.runtime.sendMessage` API in a Promise; always await it rather than
  passing a raw callback, so errors propagate normally.
