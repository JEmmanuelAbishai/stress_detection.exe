import { ALARM_AGGREGATE_REPORTS, ALARM_PRUNE_OLD_SESSIONS } from "@shared/constants";
import { settingsRepo } from "@storage/settingsRepo";
import { sessionsRepo } from "@storage/sessionsRepo";
import { aggregateDailyReport } from "@reports/reportBuilder";
import { toDateKey } from "@utils/time";
import { createLogger } from "@utils/logger";

const log = createLogger("background:alarms");

export function registerAlarms(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_AGGREGATE_REPORTS, { periodInMinutes: 60 });
    chrome.alarms.create(ALARM_PRUNE_OLD_SESSIONS, { periodInMinutes: 60 * 12 });
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_AGGREGATE_REPORTS) {
      void runReportAggregation();
    } else if (alarm.name === ALARM_PRUNE_OLD_SESSIONS) {
      void runPruning();
    }
  });
}

async function runReportAggregation(): Promise<void> {
  try {
    const today = toDateKey(Date.now());
    const yesterday = toDateKey(Date.now() - 24 * 60 * 60 * 1000);
    await aggregateDailyReport(today);
    await aggregateDailyReport(yesterday);
    log.debug("Aggregated daily reports for", today, "and", yesterday);
  } catch (err) {
    log.error("Failed to aggregate daily reports", err);
  }
}

async function runPruning(): Promise<void> {
  try {
    const { retentionDays } = await settingsRepo.get();
    const removed = await sessionsRepo.pruneOlderThan(retentionDays);
    if (removed > 0) log.info(`Pruned ${removed} sessions older than ${retentionDays} days.`);
  } catch (err) {
    log.error("Failed to prune old sessions", err);
  }
}
