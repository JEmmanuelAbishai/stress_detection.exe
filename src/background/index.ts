import { registerAlarms } from "./alarms";
import { registerMessageRouter } from "./messageRouter";
import { createLogger } from "@utils/logger";

const log = createLogger("background:index");

registerMessageRouter();
registerAlarms();

chrome.runtime.onInstalled.addListener((details) => {
  log.info("Extension installed/updated:", details.reason);
});

log.debug("Service worker started.");
