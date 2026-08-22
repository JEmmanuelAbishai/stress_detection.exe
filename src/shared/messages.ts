import type { FeatureVector, StressPrediction, TypingSession, UserSettings } from "./types";

/**
 * Typed message protocol for chrome.runtime.sendMessage / onMessage.
 * Every message has a `type` discriminant so listeners can switch on it
 * with full type narrowing instead of casting `any`.
 */

export type ExtensionMessage =
  | { type: "SESSION_FEATURES_READY"; sessionId: string; domain: string; features: FeatureVector }
  | { type: "SESSION_STARTED"; sessionId: string; domain: string; tabId: number }
  | { type: "SESSION_ENDED"; sessionId: string }
  | { type: "PREDICTION_READY"; sessionId: string; prediction: StressPrediction }
  | { type: "GET_ACTIVE_SESSION"; tabId: number }
  | { type: "GET_RECENT_SESSIONS"; limit: number }
  | { type: "GET_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; settings: Partial<UserSettings> }
  | { type: "REQUEST_EXPORT"; format: "csv" | "pdf"; range: { from: string; to: string } };

export type ExtensionResponse =
  | { ok: true; activeSession: TypingSession | null }
  | { ok: true; sessions: TypingSession[] }
  | { ok: true; settings: UserSettings }
  | { ok: true }
  | { ok: false; error: string };

/** Small typed wrapper around chrome.runtime.sendMessage for callers. */
export function sendMessage<T extends ExtensionResponse = ExtensionResponse>(
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}