import type { DailyReport, TypingSession, UserSettings } from "./types";

/** Typed request envelope every surface sends to the background worker. */
export type RuntimeMessage =
  | { type: "GET_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; settings: Partial<UserSettings> }
  | { type: "GET_RECENT_SESSIONS"; limit?: number }
  | { type: "GET_ALL_SESSIONS" }
  | { type: "ADD_SESSION"; session: TypingSession }
  | { type: "GET_DAILY_REPORTS"; days?: number }
  | { type: "GET_DOMAIN_BREAKDOWN" };

/** A domain + session count, e.g. for the dashboard's top-domains bar chart. */
export interface DomainCount {
  domain: string;
  count: number;
}

/** Typed response envelope the background worker returns. */
export type MessageResponse =
  | { ok: true; settings: UserSettings }
  | { ok: true; sessions: TypingSession[] }
  | { ok: true; reports: DailyReport[] }
  | { ok: true; domains: DomainCount[] }
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sends a message from any surface to the background service worker and awaits
 * its typed response. Uses the callback form of chrome.runtime.sendMessage so
 * it works without relying on Promise overloads in @types/chrome.
 */
export function sendMessage(message: RuntimeMessage): Promise<MessageResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? "Unknown runtime error"));
        return;
      }
      resolve(response as MessageResponse);
    });
  });
}