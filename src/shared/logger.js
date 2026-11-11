/**
 * MemoKit - persistent logger.
 * Background console output is hard to capture during crashes, so errors are
 * also stored (ring buffer) and shown on the options page "About" tab.
 */
import { LOG_PREFIX, MAX_LOG_ENTRIES } from "./constants.js";
import { getLogs, setLogs } from "./storage.js";

export const log = (...args) => console.log(LOG_PREFIX, ...args);

export async function logError(msg, error) {
  console.error(LOG_PREFIX, msg, error ?? "");
  try {
    const logs = await getLogs();
    logs.push({
      time: new Date().toISOString(),
      msg,
      error: error?.message || String(error ?? ""),
    });
    await setLogs(logs.slice(-MAX_LOG_ENTRIES));
  } catch (e) {
    console.error(LOG_PREFIX, "Internal logging failed", e);
  }
}
