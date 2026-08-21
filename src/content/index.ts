import { SessionTracker } from "./sessionTracker";
import { sendMessage } from "@shared/messages";
import { DEFAULT_SETTINGS } from "@shared/types";
import { createLogger } from "@utils/logger";

const log = createLogger("content:index");

/**
 * Content script entry point. Injected into every page (see manifest.json).
 * Fetches current settings from the background service worker, then hands
 * off to SessionTracker, which does the actual listening + feature
 * extraction. Kept intentionally thin: all persistence and inference happen
 * in the background/ml layers, not here.
 */
async function bootstrap(): Promise<void> {
  let settings = DEFAULT_SETTINGS;
  try {
    const response = await sendMessage({ type: "GET_SETTINGS" });
    if (response.ok && "settings" in response) settings = response.settings;
  } catch (err) {
    log.warn("Could not reach background for settings, using defaults.", err);
  }

  if (!settings.detectionEnabled) {
    log.info("Stress detection is disabled in settings.");
    return;
  }

  const tracker = new SessionTracker(settings);
  tracker.start();
}

void bootstrap();
