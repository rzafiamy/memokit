/**
 * MemoKit - Background Service Worker (entry point).
 * Focus: High-reliability tab restoration for Linux/Snap Chromium.
 * See docs/DEVELOPMENT_RULES.md before changing timings or permissions.
 *
 * All listeners are registered synchronously at top level, as MV3 requires.
 */
import { ACTIONS, DEFAULT_STARTUP_TABS, OPEN_MODES, STORAGE_KEYS, TIMING } from "../shared/constants.js";
import { log } from "../shared/logger.js";
import { restoreFixedTabs } from "./restore.js";
import { openProfile, openUrl, undoSwitch } from "./profiles.js";
import { registerOmnibox } from "./omnibox.js";

chrome.runtime.onStartup.addListener(() => {
  log("Browser startup detected.");
  setTimeout(restoreFixedTabs, TIMING.STARTUP_DELAY);
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    log("Extension installed.");
    await chrome.storage.local.set({
      [STORAGE_KEYS.STARTUP_TABS]: DEFAULT_STARTUP_TABS,
      [STORAGE_KEYS.AUTO_CLEANUP]: false,
      [STORAGE_KEYS.LAST_UPDATED]: Date.now(),
    });
  }
  setTimeout(restoreFixedTabs, TIMING.INSTALL_DELAY);
});

/* Messages from the popup / options page. */
const handlers = {
  [ACTIONS.RESTORE_NOW]: () => restoreFixedTabs(),
  [ACTIONS.OPEN_PROFILE]: ({ profile, mode }) => openProfile(profile, mode),
  [ACTIONS.SWITCH_TO_PROFILE]: ({ profile }) => openProfile(profile, OPEN_MODES.REPLACE),
  [ACTIONS.OPEN_URL]: ({ url, mode }) => openUrl(url, mode),
  [ACTIONS.UNDO_SWITCH]: () => undoSwitch(),
};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const handler = handlers[request?.action];
  if (!handler) return false;
  handler(request).then((success) => sendResponse({ success }));
  return true; // keep the channel open for the async response
});

/* Keyboard shortcuts (configurable at chrome://extensions/shortcuts). */
chrome.commands?.onCommand.addListener((command) => {
  if (command === "undo-switch") undoSwitch();
  if (command === "restore-startup") restoreFixedTabs();
});

registerOmnibox();
