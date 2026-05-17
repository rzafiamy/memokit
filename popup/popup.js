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
    if (!(await showCustomDialog("Replace List", "This will REPLACE your current fixed list. Continue?", true))) return;

    captureBtn.classList.add('loading');
    
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const list = tabs.map(t => ({ 
      url: t.url, 
      pinned: t.pinned,
      title: t.title 
    }));

    await chrome.storage.local.set({ 
      startupTabs: list,
      lastUpdated: Date.now()
    });

    setTimeout(() => {
      captureBtn.classList.remove('loading');
      captureBtn.classList.add('success');
      setTimeout(() => {
        captureBtn.classList.remove('success');
      }, 2000);
    }, 500);
  });

  // Restore Fixed Set
  restoreBtn.addEventListener('click', () => {
    restoreBtn.classList.add('loading');

    chrome.runtime.sendMessage({ action: "restoreNow" }, (response) => {
      if (response && response.success) {
        setTimeout(() => {
          restoreBtn.classList.remove('loading');
          restoreBtn.classList.add('success');
          setTimeout(() => {
            restoreBtn.classList.remove('success');
          }, 2000);
        }, 500);
      } else {
        restoreBtn.classList.remove('loading');
      }
    });
  });

  // Close Other Tabs
  document.getElementById('close-others-btn').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTab = tabs.find(t => t.active);
    const otherTabIds = tabs
      .filter(t => t.id !== activeTab.id && !t.pinned) // Preservation: Don't close pinned tabs
      .map(t => t.id);
      
    if (otherTabIds.length > 0) {
      if (await showCustomDialog("Close Tabs", `Close ${otherTabIds.length} other tabs? (Pinned tabs will be kept)`, true)) {
        await chrome.tabs.remove(otherTabIds);
      }
    } else {
      await showCustomDialog("Notice", "No other non-pinned tabs to close.");
    }
  });

  // Save to Profile Logic
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const saveProfileForm = document.getElementById('save-profile-form');
  const confirmSaveBtn = document.getElementById('confirm-save-profile');
  const cancelSaveBtn = document.getElementById('cancel-save-profile');
  const newProfileNameInput = document.getElementById('new-profile-name');

  saveProfileBtn.addEventListener('click', () => {
    saveProfileForm.style.display = 'flex';
    newProfileNameInput.focus();
  });

  cancelSaveBtn.addEventListener('click', () => {
    saveProfileForm.style.display = 'none';
    newProfileNameInput.value = '';
  });

  // Search/Filter Profiles
  const searchInput = document.getElementById('profile-search');
  searchInput.addEventListener('input', (e) => {
    loadProfiles(e.target.value.toLowerCase());
  });

  confirmSaveBtn.addEventListener('click', async () => {
    const name = newProfileNameInput.value.trim();
    if (!name) {
      await showCustomDialog("Error", "Please enter a profile name");
      return;
    }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urls = tabs.map(t => t.url).filter(u => u && !u.startsWith('chrome'));

    if (urls.length === 0) {
      await showCustomDialog("Error", "No valid URLs to save");
      return;
    }

    const { tabProfiles = [] } = await chrome.storage.local.get("tabProfiles");
    
    // Check if profile exists
    const existingIndex = tabProfiles.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex >= 0) {
      if (await showCustomDialog("Update Profile", `Profile "${tabProfiles[existingIndex].name}" already exists. Update it with current tabs?`, true)) {
        tabProfiles[existingIndex].urls = urls;
        console.log("MemoKit: Profile updated", tabProfiles[existingIndex]);
      } else {
        return;
      }
    } else {
      tabProfiles.push({
        id: Date.now().toString(),
        name: name,
        urls: urls
      });
      console.log("MemoKit: New profile created", name);
    }

    await chrome.storage.local.set({ tabProfiles });
    
    saveProfileForm.style.display = 'none';
    newProfileNameInput.value = '';
    loadProfiles(); // Refresh list
  });

  // Open Settings
  const openSettingsHandler = (e, tab = 'settings') => {
    e.preventDefault();
    const url = chrome.runtime.getURL('options/options.html') + (tab ? `#${tab}` : '');
    if (chrome.runtime.openOptionsPage) {
      // openOptionsPage doesn't support hash fragments easily, so we might need window.open
      window.open(url);
    } else {
      window.open(url);
    }
  };

  openSettings.addEventListener('click', (e) => openSettingsHandler(e));
  document.getElementById('manage-profiles').addEventListener('click', (e) => openSettingsHandler(e, 'profiles'));

  // Load and Render Profiles
  loadProfiles();
});

async function loadProfiles(filter = '') {
  const { tabProfiles = [] } = await chrome.storage.local.get("tabProfiles");
  const listContainer = document.getElementById('profiles-list');
  const datalist = document.getElementById('profile-datalist');
  
  if (tabProfiles.length === 0) {
    listContainer.innerHTML = '<p class="empty-hint">No profiles configured.</p>';
    return;
  }

  // Update datalist for autocomplete
  if (datalist) {
    datalist.innerHTML = tabProfiles.map(p => `<option value="${p.name}">`).join('');
  }

  const filteredProfiles = tabProfiles.filter(p => 
    p.name.toLowerCase().includes(filter)
  );

  listContainer.innerHTML = '';
  
  if (filteredProfiles.length === 0) {
    listContainer.innerHTML = '<p class="empty-hint">No profiles match your search.</p>';
    return;
  }

  filteredProfiles.forEach(profile => {
    const btn = document.createElement('button');
    btn.className = 'profile-pill';
    btn.innerHTML = `
      <span class="profile-name">${profile.name}</span>
      <span class="url-count">${profile.urls.length}</span>
    `;
    
    btn.addEventListener('click', async () => {
      switchToProfile(profile);
    });
    
    listContainer.appendChild(btn);
  });
}

async function switchToProfile(profile) {
  // Use background script for reliable switching (so popup closing doesn't kill the process)
  await chrome.runtime.sendMessage({ action: "switchToProfile", profile });
  window.close(); // Close popup after message is sent
}

async function showCustomDialog(title, message, isConfirm = false) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-dialog');
    const titleEl = document.getElementById('custom-dialog-title');
    const msgEl = document.getElementById('custom-dialog-message');
    const cancelBtn = document.getElementById('custom-dialog-cancel');
    const confirmBtn = document.getElementById('custom-dialog-confirm');

    titleEl.textContent = title;
    msgEl.textContent = message;
    cancelBtn.style.display = isConfirm ? 'inline-block' : 'none';

    const cleanup = () => {
      overlay.classList.remove('show');
      setTimeout(() => { overlay.style.display = 'none'; }, 200);
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    };

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);

    overlay.style.display = 'flex';
    void overlay.offsetWidth; // trigger reflow
    overlay.classList.add('show');
  });
}
