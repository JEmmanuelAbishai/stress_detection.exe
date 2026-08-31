import type { ExtensionMessage, ExtensionResponse } from "@shared/messages";
import type { TypingSession } from "@shared/types";
import { sessionsRepo } from "@storage/sessionsRepo";
import { settingsRepo } from "@storage/settingsRepo";
import { predictStress } from "@ml/inferenceEngine";
import { createLogger } from "@utils/logger";
import { dailyReportsToCSV, downloadCSV, sessionsToCSV } from "@reports/exportCSV";
import { downloadReportPDF } from "@reports/exportPDF";
import { getReportsInRange } from "@reports/reportBuilder";

const log = createLogger("background:messageRouter");

// tabId -> in-progress session, keyed by sender.tab.id (not the content
// script's own placeholder tabId, which it can't know).
const activeSessions = new Map<number, TypingSession>();

export function registerMessageRouter(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    handle(message, sender)
      .then(sendResponse)
      .catch((err) => {
        log.error("Unhandled error while routing message", message.type, err);
        sendResponse({ ok: false, error: String(err) } satisfies ExtensionResponse);
      });
    return true; // keep the message channel open for the async response
  });
}

async function handle(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse> {
  const tabId = sender.tab?.id ?? -1;

  switch (message.type) {
    case "SESSION_STARTED": {
      const session: TypingSession = {
        id: message.sessionId,
        domain: message.domain,
        tabId,
        startedAt: Date.now(),
        endedAt: null,
        keystrokeCount: 0,
        features: null,
        prediction: null
      };
      activeSessions.set(tabId, session);
      return { ok: true };
    }

    case "SESSION_FEATURES_READY": {
      const settings = await settingsRepo.get();
      const prediction = await predictStress(message.features, settings.sensitivity);

      const existing = activeSessions.get(tabId);
      const session: TypingSession = {
        id: message.sessionId,
        domain: message.domain,
        tabId,
        startedAt: existing?.startedAt ?? Date.now(),
        endedAt: Date.now(),
        keystrokeCount: existing?.keystrokeCount ?? 0,
        features: message.features,
        prediction
      };

      await sessionsRepo.upsert(session);
      activeSessions.set(tabId, session);

      // Fire-and-forget broadcast so an already-open popup/dashboard can
      // update live; safe to ignore "no receiving end" errors when nothing
      // is listening.
      chrome.runtime.sendMessage({ type: "PREDICTION_READY", sessionId: message.sessionId, prediction }).catch(() => {});

      if (prediction.level === "elevated" || prediction.level === "critical") {
        if (settings.notifyOnElevated) notifyElevatedStress(prediction.level);
      }

      return { ok: true };
    }

    case "SESSION_ENDED": {
      activeSessions.delete(tabId);
      return { ok: true };
    }

    case "GET_ACTIVE_SESSION": {
      return { ok: true, activeSession: activeSessions.get(message.tabId) ?? null };
    }

    case "GET_RECENT_SESSIONS": {
      const sessions = await sessionsRepo.getRecent(message.limit);
      return { ok: true, sessions };
    }

    case "GET_SETTINGS": {
      const settings = await settingsRepo.get();
      return { ok: true, settings };
    }

    case "UPDATE_SETTINGS": {
      await settingsRepo.update(message.settings);
      return { ok: true };
    }

    case "REQUEST_EXPORT": {
      const from = new Date(message.range.from).getTime();
      const to = new Date(message.range.to).getTime();
      if (message.format === "csv") {
        const sessions = await sessionsRepo.getInRange(from, to);
        downloadCSV(sessionsToCSV(sessions), `stress-sessions_${message.range.from}_${message.range.to}.csv`);
      } else {
        const reports = await getReportsInRange(message.range.from, message.range.to);
        downloadReportPDF(
          reports,
          `${message.range.from} to ${message.range.to}`,
          `stress-report_${message.range.from}_${message.range.to}.pdf`
        );
        void dailyReportsToCSV(reports); // reserved for a future "include raw CSV" toggle
      }
      return { ok: true };
    }

    case "PREDICTION_READY": {
      // This message type is emitted BY the background (see
      // SESSION_FEATURES_READY above) for popup/dashboard to listen for via
      // chrome.runtime.onMessage, not something sent TO the background. It's
      // included in ExtensionMessage so both directions share one typed
      // union; the background never receives it as an incoming request.
      return { ok: false, error: "PREDICTION_READY is a background-to-UI push message, not a request." };
    }

    default: {
      const _exhaustive: never = message;
      return { ok: false, error: `Unknown message type: ${JSON.stringify(_exhaustive)}` };
    }
  }
}

function notifyElevatedStress(level: "elevated" | "critical"): void {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon44.png",
    title: level === "critical" ? "Stress signals look high" : "Stress signals rising",
    message: "Your recent typing patterns suggest it might be a good time for a short break.",
    priority: level === "critical" ? 2 : 1
  });
}
