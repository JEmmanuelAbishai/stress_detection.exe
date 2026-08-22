import { FeatureExtractor } from "./featureExtractor";
import { KeystrokeListener } from "./keystrokeListener";
import { MIN_KEYSTROKES_FOR_INFERENCE, SESSION_IDLE_TIMEOUT_MS } from "@shared/constants";
import { extractDomain, isExcluded } from "@utils/domain";
import { createLogger } from "@utils/logger";
import { sendMessage } from "@shared/messages";
import type { UserSettings } from "@shared/types";

const log = createLogger("content:sessionTracker");

/**
 * Owns the lifecycle of a single typing session on this page: starts a
 * session on first keystroke, feeds events to the FeatureExtractor, and
 * ends/flushes the session after SESSION_IDLE_TIMEOUT_MS of inactivity or on
 * page unload.
 */
export class SessionTracker {
  private sessionId: string | null = null;
  private sessionStartedAt: number | null = null;
  private idleTimer: number | null = null;
  private extractor = new FeatureExtractor();
  private listener: KeystrokeListener;
  private domain = extractDomain(location.href);
  private settings: UserSettings;

  constructor(settings: UserSettings) {
    this.settings = settings;
    this.listener = new KeystrokeListener({ captureKeyIdentity: settings.captureKeyIdentity });
  }

  start(): void {
    if (!this.settings.detectionEnabled || isExcluded(this.domain, this.settings.excludedDomains)) {
      log.info("Detection disabled or domain excluded; not starting listener.", this.domain);
      return;
    }

    this.listener.onEvent((event) => {
      this.ensureSessionStarted();
      this.extractor.ingest(event);
      this.resetIdleTimer();
    });
    this.listener.start();

    window.addEventListener("beforeunload", () => this.endSession());
  }

  stop(): void {
    this.listener.stop();
    this.endSession();
  }

  private ensureSessionStarted(): void {
    if (this.sessionId) return;
    this.sessionId = crypto.randomUUID();
    this.sessionStartedAt = performance.now();
    void sendMessage({
      type: "SESSION_STARTED",
      sessionId: this.sessionId,
      domain: this.domain,
      tabId: -1 // background resolves the real tabId from the sender
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.endSession(), SESSION_IDLE_TIMEOUT_MS);
  }

  private endSession(): void {
    if (!this.sessionId || this.sessionStartedAt === null) return;

    const durationMs = performance.now() - this.sessionStartedAt;
    if (this.extractor.hasEnoughData(MIN_KEYSTROKES_FOR_INFERENCE)) {
      const features = this.extractor.extract(durationMs);
      void sendMessage({
        type: "SESSION_FEATURES_READY",
        sessionId: this.sessionId,
        domain: this.domain,
        features
      });
    } else {
      log.debug("Session ended with too few keystrokes for inference; skipping.");
    }

    void sendMessage({ type: "SESSION_ENDED", sessionId: this.sessionId });

    this.extractor.reset();
    this.sessionId = null;
    this.sessionStartedAt = null;
  }
}
