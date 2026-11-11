/**
 * MemoKit - typed wrappers for messages sent to the service worker.
 * The service worker does the tab work so it survives the popup closing.
 */
import { ACTIONS } from "./constants.js";

const send = (message) => chrome.runtime.sendMessage(message);

export const requestRestore = () => send({ action: ACTIONS.RESTORE_NOW });

/** @param {string} [mode] one of OPEN_MODES; defaults to the user's setting. */
export const requestOpenProfile = (profile, mode) => send({ action: ACTIONS.OPEN_PROFILE, profile, mode });

/** Focus the tab showing `url` if it is open anywhere, else open it. */
export const requestOpenUrl = (url, mode) => send({ action: ACTIONS.OPEN_URL, url, mode });

export const requestUndoSwitch = () => send({ action: ACTIONS.UNDO_SWITCH });
