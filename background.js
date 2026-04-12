/**
 * MemoKit - Background Service Worker
 * Handles startup restoration and tab synchronization logic.
 * Developed by Makix team (infodev.ovh)
 */

const DEFAULT_STARTUP_TABS = [
  { url: "https://github.com/rzafiamy/memokit", pinned: false },
  { url: "https://infodev.ovh", pinned: false }
];

/**
 * Restores the fixed set of tabs and cleans up any extras.
 */
async function restoreFixedTabs() {
  console.log("MemoKit: Restoring fixed tabs...");
  const { startupTabs = DEFAULT_STARTUP_TABS, autoCleanup = true } = await chrome.storage.sync.get(["startupTabs", "autoCleanup"]);

  // Get current window tabs
  const currentTabs = await chrome.tabs.query({ currentWindow: true });
  const desiredUrls = new Set(startupTabs.map(t => new URL(t.url).href));

  if (autoCleanup) {
    // Step 1: Close any tab that is NOT in our list (matching exact URL for now)
    for (const tab of currentTabs) {
      try {
        const tabUrl = new URL(tab.url).href;
        if (!desiredUrls.has(tabUrl)) {
          console.log(`MemoKit: Removing extra tab: ${tabUrl}`);
          await chrome.tabs.remove(tab.id);
        }
      } catch (e) {
        // Handle cases where tab.url might be empty or invalid (e.g. chrome://)
        continue;
      }
    }
  }

  // Refresh current tabs after potentially removing some
  const updatedTabs = await chrome.tabs.query({ currentWindow: true });

  // Step 2: Open missing tabs or reposition them
  for (let i = 0; i < startupTabs.length; i++) {
    const wanted = startupTabs[i];
    const existing = updatedTabs.find(t => {
      try {
        return new URL(t.url).href === new URL(wanted.url).href;
      } catch {
        return false;
      }
    });

    if (!existing) {
      console.log(`MemoKit: Creating tab: ${wanted.url}`);
      await chrome.tabs.create({
        url: wanted.url,
        pinned: wanted.pinned || false,
        index: i
      });
    } else {
      // Ensure pinned status and correct index
      if (existing.pinned !== (wanted.pinned || false)) {
        await chrome.tabs.update(existing.id, { pinned: wanted.pinned || false });
      }
      if (existing.index !== i) {
        await chrome.tabs.move(existing.id, { index: i });
      }
    }
  }
}

// Run on every browser start
chrome.runtime.onStartup.addListener(restoreFixedTabs);

// Run when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.sync.set({ 
      startupTabs: DEFAULT_STARTUP_TABS,
      autoCleanup: true,
      lastUpdated: Date.now()
    });
  }
  restoreFixedTabs();
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "restoreNow") {
    restoreFixedTabs().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }
});
