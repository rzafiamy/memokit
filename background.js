/**
 * MemoKit - Background Service Worker
 * Focus: High-reliability tab restoration for production.
 */

const DEFAULT_STARTUP_TABS = [
  { url: "https://github.com/rzafiamy/memokit", pinned: false },
  { url: "https://infodev.ovh", pinned: false }
];

let isRestoring = false;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function logError(msg, error) {
  try {
    console.error(`MemoKit: ${msg}`, error);
    const { logs = [] } = await chrome.storage.local.get("logs");
    logs.push({ time: new Date().toISOString(), msg, error: error?.message || String(error) });
    await chrome.storage.local.set({ logs: logs.slice(-50) });
  } catch (e) {}
}

async function restoreFixedTabs(retryCount = 0) {
  if (isRestoring) return;
  isRestoring = true;

  try {
    const { startupTabs = DEFAULT_STARTUP_TABS, autoCleanup = true } = await chrome.storage.local.get(["startupTabs", "autoCleanup"]);
    
    // Find a valid window with retries
    let windowId = null;
    const windows = await chrome.windows.getAll({ populate: false });
    
    if (windows && windows.length > 0) {
       const focused = windows.find(w => w.focused);
       windowId = focused ? focused.id : windows[0].id;
    }

    if (!windowId) {
      if (retryCount < 5) {
        await sleep(3000);
        isRestoring = false;
        return restoreFixedTabs(retryCount + 1);
      }
      return;
    }

    const desiredUrls = new Set();
    startupTabs.forEach(t => { try { desiredUrls.add(new URL(t.url).href); } catch (e) {} });

    // Step-by-step creation ensuring no race conditions
    const currentTabs = await chrome.tabs.query({ windowId });
    for (let i = 0; i < startupTabs.length; i++) {
        const wanted = startupTabs[i];
        const exists = currentTabs.some(t => {
            try { return new URL(t.url).href === new URL(wanted.url).href; } catch { return false; }
        });

        if (!exists) {
            await chrome.tabs.create({ windowId, url: wanted.url, pinned: wanted.pinned || false, index: i, active: false });
            await sleep(300); // Important delay for Snap stability
        }
    }

    // Step-by-step cleanup
    if (autoCleanup) {
        let allTabs = await chrome.tabs.query({ windowId });
        const tabsToRemove = [];

        for (const tab of allTabs) {
            try {
                if (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) continue;
                const tabUrl = new URL(tab.url).href;
                if (!desiredUrls.has(tabUrl)) tabsToRemove.push(tab);
            } catch (e) {}
        }

        for (const tab of tabsToRemove) {
            const pool = await chrome.tabs.query({ windowId });
            if (pool.length > 1) { // Safety: never close last tab
                await chrome.tabs.remove(tab.id).catch(() => {});
                await sleep(300);
            }
        }
    }
  } catch (error) {
    await logError("Restoration sequence failed", error);
  } finally {
    isRestoring = false;
  }
}

chrome.runtime.onStartup.addListener(() => {
  setTimeout(restoreFixedTabs, 1500);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ 
      startupTabs: DEFAULT_STARTUP_TABS,
      autoCleanup: true,
      lastUpdated: Date.now()
    });
  }
  setTimeout(restoreFixedTabs, 1000);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "restoreNow") {
    restoreFixedTabs().then(() => sendResponse({ success: true }));
    return true; 
  }
});




