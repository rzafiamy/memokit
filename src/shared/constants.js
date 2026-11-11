/**
 * MemoKit - shared constants.
 * Single source of truth for storage keys, message actions and tuning values.
 */

export const LOG_PREFIX = "MemoKit:";

/** Keys used in chrome.storage.local. */
export const STORAGE_KEYS = Object.freeze({
  STARTUP_TABS: "startupTabs",
  TAB_PROFILES: "tabProfiles",
  AUTO_CLEANUP: "autoCleanup",
  LAST_UPDATED: "lastUpdated",
  LOGS: "logs",
  OPEN_MODE: "openMode",
  LAST_SNAPSHOT: "lastSnapshot",
});

/** Message actions exchanged between UI pages and the service worker. */
export const ACTIONS = Object.freeze({
  RESTORE_NOW: "restoreNow",
  SWITCH_TO_PROFILE: "switchToProfile", // legacy alias of OPEN_PROFILE with mode "replace"
  OPEN_PROFILE: "openProfile",
  OPEN_URL: "openUrl",
  UNDO_SWITCH: "undoSwitch",
});

/** How a profile is opened. */
export const OPEN_MODES = Object.freeze({
  REPLACE: "replace", // replace the non-pinned tabs of the current window
  WINDOW: "window",   // open in a new window
  APPEND: "append",   // add missing tabs to the current window
});
export const DEFAULT_OPEN_MODE = OPEN_MODES.REPLACE;

/** Profile color palette (name -> CSS color). */
export const PROFILE_COLORS = Object.freeze({
  indigo: "#6366f1",
  cyan: "#22d3ee",
  green: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#a855f7",
  slate: "#94a3b8",
});

/** Color of a profile, falling back to a stable color derived from its id. */
export function profileColor(profile) {
  if (profile?.color && PROFILE_COLORS[profile.color]) return PROFILE_COLORS[profile.color];
  const palette = Object.values(PROFILE_COLORS);
  const seed = [...String(profile?.id ?? profile?.name ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

export const DEFAULT_STARTUP_TABS = Object.freeze([
  { url: "https://github.com/rzafiamy/memokit", pinned: false },
  { url: "https://infodev.ovh", pinned: false },
]);

/**
 * Timing values (ms). See docs/DEVELOPMENT_RULES.md for why these delays exist
 * (Snap Chromium stability: "slow start" and "no IPC bursts").
 */
export const TIMING = Object.freeze({
  STARTUP_DELAY: 3000,
  INSTALL_DELAY: 2000,
  WINDOW_RETRY_DELAY: 3000,
  WINDOW_RETRY_MAX: 3,
  TAB_OPEN_DELAY: 650,
  TAB_CLOSE_DELAY: 600,
});

export const MAX_LOG_ENTRIES = 50;

export const OPTIONS_PAGE = "options/options.html";
