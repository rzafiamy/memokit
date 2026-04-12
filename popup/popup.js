/**
 * MemoKit - Popup Script
 * Handles quick actions from the extension popup.
 */

document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('capture-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const openSettings = document.getElementById('open-settings');

  // Capture Current Windows
  captureBtn.addEventListener('click', async () => {
    if (!confirm("This will REPLACE your current fixed list. Continue?")) return;

    captureBtn.disabled = true;
    captureBtn.textContent = 'Saving...';

    const tabs = await chrome.tabs.query({ currentWindow: true });
    // Filter out internal chrome pages if needed, but let's keep it simple for now as requested
    const list = tabs.map(t => ({ 
      url: t.url, 
      pinned: t.pinned,
      title: t.title // We'll store title for nice display in options
    }));

    await chrome.storage.sync.set({ 
      startupTabs: list,
      lastUpdated: Date.now()
    });

    setTimeout(() => {
      captureBtn.textContent = '✓ Saved Successfully';
      setTimeout(() => {
        captureBtn.disabled = false;
        captureBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Capture Current Windows
        `;
      }, 2000);
    }, 500);
  });

  // Restore Fixed Set
  restoreBtn.addEventListener('click', () => {
    restoreBtn.disabled = true;
    restoreBtn.textContent = 'Restoring...';

    chrome.runtime.sendMessage({ action: "restoreNow" }, (response) => {
      if (response && response.success) {
        setTimeout(() => {
          restoreBtn.textContent = '✓ Restored';
          setTimeout(() => {
            restoreBtn.disabled = false;
            restoreBtn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
              Restore Fixed Set
            `;
          }, 2000);
        }, 500);
      }
    });
  });

  // Open Settings
  openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });
});
