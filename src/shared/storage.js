/**
 * MemoKit - typed accessors around chrome.storage.local.
 * All persistent data goes through here so keys/defaults live in one place.
 * (storage.local, not storage.sync - see docs/DEVELOPMENT_RULES.md.)
 */
import { DEFAULT_OPEN_MODE, OPEN_MODES, STORAGE_KEYS } from "./constants.js";

const local = () => chrome.storage.local;

export async function getStartupTabs(fallback = []) {
  const data = await local().get(STORAGE_KEYS.STARTUP_TABS);
  return data[STORAGE_KEYS.STARTUP_TABS] || fallback;
}

export function setStartupTabs(tabs) {
  return local().set({
    [STORAGE_KEYS.STARTUP_TABS]: tabs,
    [STORAGE_KEYS.LAST_UPDATED]: Date.now(),
  });
}

export async function getProfiles() {
  const data = await local().get(STORAGE_KEYS.TAB_PROFILES);
  return data[STORAGE_KEYS.TAB_PROFILES] || [];
}

export function setProfiles(profiles) {
  return local().set({ [STORAGE_KEYS.TAB_PROFILES]: profiles });
}

export async function getAutoCleanup() {
  const data = await local().get(STORAGE_KEYS.AUTO_CLEANUP);
  return !!data[STORAGE_KEYS.AUTO_CLEANUP];
}

export function setAutoCleanup(enabled) {
  return local().set({ [STORAGE_KEYS.AUTO_CLEANUP]: !!enabled });
}

export async function getOpenMode() {
  const data = await local().get(STORAGE_KEYS.OPEN_MODE);
  const mode = data[STORAGE_KEYS.OPEN_MODE];
  return Object.values(OPEN_MODES).includes(mode) ? mode : DEFAULT_OPEN_MODE;
}

export function setOpenMode(mode) {
  return local().set({ [STORAGE_KEYS.OPEN_MODE]: mode });
}

/** Tabs closed by the last "replace" switch: { label, time, tabs: [{url, pinned}] } | null. */
export async function getSnapshot() {
  const data = await local().get(STORAGE_KEYS.LAST_SNAPSHOT);
  return data[STORAGE_KEYS.LAST_SNAPSHOT] || null;
}

export function setSnapshot(snapshot) {
  return local().set({ [STORAGE_KEYS.LAST_SNAPSHOT]: snapshot });
}

export async function getLogs() {
  const data = await local().get(STORAGE_KEYS.LOGS);
  return data[STORAGE_KEYS.LOGS] || [];
}

export function setLogs(logs) {
  return local().set({ [STORAGE_KEYS.LOGS]: logs });
}

/** Full snapshot of everything stored (for backup/export). */
export function exportAll() {
  return local().get(null);
}

/** Replace everything stored with `data` (for backup/import). */
export async function importAll(data) {
  await local().clear();
  await local().set(data);
}

/** Subscribe to changes of a single key. Returns an unsubscribe function. */
export function onKeyChanged(key, callback) {
  const listener = (changes, area) => {
    if (area === "local" && changes[key]) callback(changes[key].newValue);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
