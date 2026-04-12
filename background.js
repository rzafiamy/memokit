/**
 * MemoKit - Background Service Worker
 * Focus: High-reliability tab restoration for Linux/Snap Chromium.
 */

const DEFAULT_STARTUP_TABS = [
  { url: "https://github.com/rzafiamy/memokit", pinned: false },
  { url: "https://infodev.ovh", pinned: false }
];

let isRestoring = false;
let currentRestoration = null;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function logError(msg, error) {
  try {
    const logMsg = `MemoKit: ${msg}`;
    console.log(logMsg, error || "");
    const { logs = [] } = await chrome.storage.local.get("logs");
    logs.push({ 
        time: new Date().toISOString(), 
        msg, 
        error: error?.message || String(error || "") 
    });
    await chrome.storage.local.set({ logs: logs.slice(-50) });
  } catch (e) {
      console.error("MemoKit: Internal logging failed", e);
  }
}

async function restoreFixedTabs(retryCount = 0) {
  if (isRestoring) {
      console.log("MemoKit: Restoration already in progress. Linking to existing process...");
      return currentRestoration;
  }

  currentRestoration = (async () => {
    isRestoring = true;
    try {
      const data = await chrome.storage.local.get(["startupTabs", "autoCleanup"]);
      const startupTabs = data.startupTabs || DEFAULT_STARTUP_TABS;
      const autoCleanup = !!data.autoCleanup;
      
      console.log(`MemoKit: Starting restoration sequence for ${startupTabs.length} tabs...`);

      // Find the best window to use
      let windowId = null;
      try {
          const lastFocused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
          if (lastFocused) windowId = lastFocused.id;
      } catch (e) {
          console.log("MemoKit: getLastFocused failed, trying getAll...");
      }

      if (!windowId) {
          const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
          if (windows && windows.length > 0) windowId = windows[0].id;
      }

      if (!windowId) {
        if (retryCount < 3) {
          console.log(`MemoKit: No window found. Retrying in 3s... (Attempt ${retryCount + 1}/3)`);
          await sleep(3000);
          isRestoring = false;
          return await restoreFixedTabs(retryCount + 1);
        }
        await logError("Gave up: No normal window available to restore tabs into.");
        return false;
      }

      console.log(`MemoKit: Targeting window ${windowId}`);

      const normalizeUrl = (u) => {
          if (!u) return "";
          try {
              let url = new URL(u);
              let path = url.pathname;
              if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
              return (url.origin + path + url.search).toLowerCase().trim();
          } catch (e) {
              return String(u).toLowerCase().trim();
          }
      };

      const currentTabs = await chrome.tabs.query({ windowId });
      const currentNormUrls = new Set(currentTabs.map(t => normalizeUrl(t.url || t.pendingUrl)));

      console.log(`MemoKit: Scanning current window (found ${currentTabs.length} tabs)...`);

      let opened = 0;
      for (let i = 0; i < startupTabs.length; i++) {
          const wanted = startupTabs[i];
          if (!wanted || !wanted.url) continue;
          
          const wantedNorm = normalizeUrl(wanted.url);
          if (!currentNormUrls.has(wantedNorm)) {
              console.log(`MemoKit: Opening missing tab: ${wanted.url}`);
              try {
                  await chrome.tabs.create({ 
                      windowId, 
                      url: wanted.url, 
                      pinned: !!wanted.pinned, 
                      index: i, 
                      active: false 
                  });
                  opened++;
                  await sleep(650); // High-reliability delay
              } catch (e) {
                  console.error(`MemoKit: Failed to open ${wanted.url}`, e);
              }
          } else {
              console.log(`MemoKit: Tab already exists: ${wanted.url}`);
          }
      }

      if (autoCleanup) {
          console.log("MemoKit: Starting cleanup phase...");
          const desiredSet = new Set(startupTabs.map(t => normalizeUrl(t.url)));
          const allTabs = await chrome.tabs.query({ windowId });
          for (const tab of allTabs) {
              const tUrl = tab.url || tab.pendingUrl;
              if (!tUrl || tUrl.startsWith('chrome') || tUrl.startsWith('about')) continue;
              if (!desiredSet.has(normalizeUrl(tUrl))) {
                  console.log(`MemoKit: Cleaning up unauthorized tab: ${tUrl}`);
                  await chrome.tabs.remove(tab.id).catch(() => {});
                  await sleep(600);
              }
          }
      }
      
      console.log(`MemoKit: Sequence finished. Opened ${opened} new tabs.`);
      return true;
    } catch (error) {
      console.error("MemoKit: Fatal restoration error", error);
      return false;
    } finally {
      isRestoring = false;
      currentRestoration = null;
    }
  })();

  return currentRestoration;
}

// Startup Listeners
chrome.runtime.onStartup.addListener(() => {
  console.log("MemoKit: Browser startup detected.");
  setTimeout(restoreFixedTabs, 3000);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("MemoKit: Extension installed.");
    chrome.storage.local.set({ 
      startupTabs: DEFAULT_STARTUP_TABS,
      autoCleanup: false,
      lastUpdated: Date.now()
    });
  }
  setTimeout(restoreFixedTabs, 2000);
});

// Communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "restoreNow") {
    console.log("MemoKit: Manual restoration requested.");
    restoreFixedTabs().then(success => sendResponse({ success }));
    return true; 
  }
  
  if (request.action === "switchToProfile") {
    console.log(`MemoKit: Switching to profile: ${request.profile.name}`);
    performProfileSwitch(request.profile).then(success => sendResponse({ success }));
    return true;
  }
});

async function performProfileSwitch(profile) {
  try {
    const lastFocused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    const windowId = lastFocused ? lastFocused.id : (await chrome.windows.getAll({ windowTypes: ['normal'] }))[0]?.id;
    
    if (!windowId) {
      console.error("MemoKit: No target window found for profile switch");
      return false;
    }

    const oldTabs = await chrome.tabs.query({ windowId });
    const optionsUrl = chrome.runtime.getURL('options/options.html');
    const oldTabIds = oldTabs
      .filter(t => t.id && (!t.url || !t.url.startsWith(optionsUrl)))
      .map(t => t.id);
    
    // 1. Open all new tabs in the background first
    const newTabIds = [];
    for (const url of profile.urls) {
      try {
        const tab = await chrome.tabs.create({ 
          windowId,
          url: url,
          active: false 
        });
        newTabIds.push(tab.id);
      } catch (e) {
        console.error(`MemoKit: Failed to create tab for ${url}`, e);
      }
    }

    if (newTabIds.length > 0) {
      // 2. Remove old tabs
      await chrome.tabs.remove(oldTabIds).catch(e => console.log("MemoKit: Ignored tab removal error", e));
      
      // 3. Explicitly activate the first tab of the new profile
      await chrome.tabs.update(newTabIds[0], { active: true });
      
      // 4. Ensure the window itself is focused (fixes the URL bar focus issue)
      await chrome.windows.update(windowId, { focused: true });
    }
    
    return true;
  } catch (err) {
    console.error("MemoKit: Profile switch fatal error", err);
    return false;
  }
}
