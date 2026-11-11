/**
 * MemoKit - restore the fixed startup tab set.
 */
import { DEFAULT_STARTUP_TABS, TIMING } from "../shared/constants.js";
import { getAutoCleanup, getStartupTabs } from "../shared/storage.js";
import { isInternalUrl, normalizeUrl } from "../shared/url.js";
import { log, logError } from "../shared/logger.js";
import { sleep } from "../shared/utils.js";
import { tabUrl, waitForTargetWindowId } from "./windows.js";

let currentRestoration = null;

/** Restore the fixed tab set. Concurrent calls share the same run. */
export function restoreFixedTabs() {
  if (currentRestoration) {
    log("Restoration already in progress. Linking to existing process...");
    return currentRestoration;
  }
  currentRestoration = runRestoration().finally(() => {
    currentRestoration = null;
  });
  return currentRestoration;
}

async function runRestoration() {
  try {
    const startupTabs = await getStartupTabs(DEFAULT_STARTUP_TABS);
    const autoCleanup = await getAutoCleanup();
    log(`Starting restoration sequence for ${startupTabs.length} tabs...`);

    const windowId = await waitForTargetWindowId();
    if (!windowId) {
      await logError("Gave up: No normal window available to restore tabs into.");
      return false;
    }
    log(`Targeting window ${windowId}`);

    const opened = await openMissingTabs(windowId, startupTabs);
    if (autoCleanup) await closeUnlistedTabs(windowId, startupTabs);

    log(`Sequence finished. Opened ${opened} new tabs.`);
    return true;
  } catch (error) {
    await logError("Fatal restoration error", error);
    return false;
  }
}

async function openMissingTabs(windowId, startupTabs) {
  const currentTabs = await chrome.tabs.query({ windowId });
  const present = new Set(currentTabs.map((t) => normalizeUrl(tabUrl(t))));
  log(`Scanning current window (found ${currentTabs.length} tabs)...`);

  let opened = 0;
  for (const [index, wanted] of startupTabs.entries()) {
    if (!wanted?.url) continue;
    if (present.has(normalizeUrl(wanted.url))) {
      log(`Tab already exists: ${wanted.url}`);
      continue;
    }
    log(`Opening missing tab: ${wanted.url}`);
    try {
      await chrome.tabs.create({ windowId, url: wanted.url, pinned: !!wanted.pinned, index, active: false });
      opened++;
      await sleep(TIMING.TAB_OPEN_DELAY);
    } catch (e) {
      await logError(`Failed to open ${wanted.url}`, e);
    }
  }
  return opened;
}

async function closeUnlistedTabs(windowId, startupTabs) {
  log("Starting cleanup phase...");
  const desired = new Set(startupTabs.map((t) => normalizeUrl(t.url)));
  const tabs = await chrome.tabs.query({ windowId });
  for (const tab of tabs) {
    const url = tabUrl(tab);
    if (tab.pinned || isInternalUrl(url) || desired.has(normalizeUrl(url))) continue;
    log(`Cleaning up unlisted tab: ${url}`);
    await chrome.tabs.remove(tab.id).catch(() => {});
    await sleep(TIMING.TAB_CLOSE_DELAY);
  }
}
