/**
 * MemoKit - opening profiles and sites.
 *
 * Modes (see OPEN_MODES):
 *  - replace: keep pinned tabs and tabs already showing a profile URL (no reload),
 *             close the other tabs (saved as an undo snapshot), open the missing URLs.
 *  - window:  open the profile in a new window.
 *  - append:  add the profile URLs that are not already open in the current window.
 */
import { OPEN_MODES, OPTIONS_PAGE } from "../shared/constants.js";
import { getOpenMode, getSnapshot, setSnapshot } from "../shared/storage.js";
import { isInternalUrl, normalizeUrl } from "../shared/url.js";
import { log, logError } from "../shared/logger.js";
import { findOpenTab, findTargetWindowId, focusTab, tabUrl } from "./windows.js";

const resolveMode = async (mode) => (Object.values(OPEN_MODES).includes(mode) ? mode : getOpenMode());

/** Open `urls` in `windowId` (skipping `existing`), returns the tab ids in profile order. */
async function openUrlsInWindow(windowId, urls, existing = new Map()) {
  const ordered = [];
  for (const url of urls) {
    const key = normalizeUrl(url);
    if (existing.has(key)) {
      ordered.push(existing.get(key).id);
      continue;
    }
    try {
      const tab = await chrome.tabs.create({ windowId, url, active: false });
      existing.set(key, tab);
      ordered.push(tab.id);
    } catch (e) {
      await logError(`Failed to open ${url}`, e);
    }
  }
  return ordered;
}

async function activateFirst(windowId, tabIds) {
  if (tabIds.length === 0) return;
  await chrome.tabs.update(tabIds[0], { active: true });
  await chrome.windows.update(windowId, { focused: true });
}

/** Replace the window's tabs by `urls`, saving the closed tabs for undo. */
async function replaceWindowTabs(windowId, urls, snapshotLabel) {
  const optionsUrl = chrome.runtime.getURL(OPTIONS_PAGE);
  const wanted = new Set(urls.map(normalizeUrl));
  const keep = new Map();
  const close = [];

  for (const tab of await chrome.tabs.query({ windowId })) {
    const url = tabUrl(tab);
    if (tab.pinned || url.startsWith(optionsUrl)) continue; // always preserved
    const key = normalizeUrl(url);
    if (wanted.has(key) && !keep.has(key)) keep.set(key, tab);
    else close.push(tab);
  }

  const toSave = close.map(tabUrl).filter((u) => !isInternalUrl(u));
  if (toSave.length) {
    await setSnapshot({ label: snapshotLabel, time: Date.now(), tabs: toSave.map((url) => ({ url })) });
  }

  const ordered = await openUrlsInWindow(windowId, urls, keep);
  // Never close the last tabs of a window: that would close the window itself.
  if (close.length && ordered.length) {
    await chrome.tabs.remove(close.map((t) => t.id)).catch((e) => log("Ignored tab removal error", e));
  }
  await activateFirst(windowId, ordered);
  log(`Replaced window ${windowId}: kept ${keep.size}, closed ${close.length}`);
}

export async function openProfile(profile, requestedMode) {
  try {
    const urls = (profile?.urls ?? []).filter(Boolean);
    if (urls.length === 0) return false;
    const mode = await resolveMode(requestedMode);
    log(`Opening profile "${profile.name}" (${mode})`);

    if (mode === OPEN_MODES.WINDOW) {
      await chrome.windows.create({ url: urls, focused: true });
      return true;
    }

    const windowId = await findTargetWindowId();
    if (!windowId) {
      await chrome.windows.create({ url: urls, focused: true });
      return true;
    }

    if (mode === OPEN_MODES.APPEND) {
      const existing = new Map();
      for (const tab of await chrome.tabs.query({ windowId })) existing.set(normalizeUrl(tabUrl(tab)), tab);
      await activateFirst(windowId, await openUrlsInWindow(windowId, urls, existing));
      return true;
    }

    await replaceWindowTabs(windowId, urls, `Before "${profile.name}"`);
    return true;
  } catch (err) {
    await logError(`Failed to open profile "${profile?.name}"`, err);
    return false;
  }
}

/** Bring back the tabs closed by the last replace (itself undoable). */
export async function undoSwitch() {
  try {
    const snapshot = await getSnapshot();
    if (!snapshot?.tabs?.length) return false;
    const windowId = await findTargetWindowId();
    if (!windowId) {
      await chrome.windows.create({ url: snapshot.tabs.map((t) => t.url), focused: true });
      await setSnapshot(null);
      return true;
    }
    await setSnapshot(null);
    await replaceWindowTabs(windowId, snapshot.tabs.map((t) => t.url), "Before undo");
    return true;
  } catch (err) {
    await logError("Undo failed", err);
    return false;
  }
}

/** Focus the tab already showing `url` anywhere, else open it. */
export async function openUrl(url, mode) {
  try {
    if (mode === OPEN_MODES.WINDOW) {
      await chrome.windows.create({ url, focused: true });
      return true;
    }
    const existing = await findOpenTab(url);
    if (existing) {
      await focusTab(existing);
      return true;
    }
    const windowId = await findTargetWindowId();
    if (!windowId) await chrome.windows.create({ url, focused: true });
    else await focusTab(await chrome.tabs.create({ windowId, url, active: true }));
    return true;
  } catch (err) {
    await logError(`Failed to open ${url}`, err);
    return false;
  }
}
