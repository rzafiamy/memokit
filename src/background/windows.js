/**
 * MemoKit - window/tab helpers for the service worker.
 */
import { TIMING } from "../shared/constants.js";
import { log } from "../shared/logger.js";
import { normalizeUrl } from "../shared/url.js";
import { sleep } from "../shared/utils.js";

/** Last focused normal window, else the first normal window, else null. */
export async function findTargetWindowId() {
  try {
    const focused = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    if (focused?.id) return focused.id;
  } catch {
    log("getLastFocused failed, trying getAll...");
  }
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  return windows?.[0]?.id ?? null;
}

/** Retry finding a window: at browser startup none may exist yet. */
export async function waitForTargetWindowId() {
  for (let attempt = 0; attempt <= TIMING.WINDOW_RETRY_MAX; attempt++) {
    const id = await findTargetWindowId();
    if (id) return id;
    if (attempt < TIMING.WINDOW_RETRY_MAX) {
      log(`No window found. Retrying in ${TIMING.WINDOW_RETRY_DELAY}ms... (Attempt ${attempt + 1}/${TIMING.WINDOW_RETRY_MAX})`);
      await sleep(TIMING.WINDOW_RETRY_DELAY);
    }
  }
  return null;
}

export const tabUrl = (tab) => tab.url || tab.pendingUrl || "";

/** First tab (in any normal window) showing `url`, compared normalized. */
export async function findOpenTab(url) {
  const wanted = normalizeUrl(url);
  const tabs = await chrome.tabs.query({ windowType: "normal" });
  return tabs.find((t) => normalizeUrl(tabUrl(t)) === wanted) ?? null;
}

/** Activate a tab and bring its window to the front. */
export async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}
