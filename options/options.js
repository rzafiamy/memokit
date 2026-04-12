/**
 * MemoKit - Options Script
 * Handles managing startup tabs and extension settings.
 */

let startupTabs = [];
let tabProfiles = [];
let editingIndex = -1;
let editingProfileIndex = -1;

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Handle Hash Navigation
  if (window.location.hash) {
    const target = window.location.hash.slice(1);
    switchTab(target);
  }

  function switchTab(target) {
    const navItem = Array.from(navItems).find(i => i.getAttribute('data-tab') === target);
    if (!navItem) return;

    navItems.forEach(nav => nav.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    navItem.classList.add('active');
    const content = document.getElementById(target === 'profiles' ? 'profiles' : (target === 'tab-list' ? 'tab-list' : target));
    if (content) content.classList.add('active');

    if (target === 'about') {
      loadLogs();
    }
  }

  // Load Data
  await loadData();

  // Add Tab Button
  document.getElementById('add-tab-btn').addEventListener('click', () => {
    openModal("Add Startup Tab");
  });

  // Add Profile Button
  document.getElementById('add-profile-btn').addEventListener('click', () => {
    openProfileModal("Create Tab Profile");
  });

  // Modal Actions
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-tab-btn').addEventListener('click', saveTab);

  document.getElementById('profile-cancel-btn').addEventListener('click', closeProfileModal);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

  // Import/Export
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importData);

  // Auto-Cleanup Toggle
  const cleanupToggle = document.getElementById('auto-cleanup-toggle');
  cleanupToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoCleanup: e.target.checked });
  });

  // Initial UI state for toggle
  const { autoCleanup = false } = await chrome.storage.local.get("autoCleanup");
  cleanupToggle.checked = autoCleanup;

  // Sync with storage changes (in case profile created in popup)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.startupTabs) {
      startupTabs = changes.startupTabs.newValue || [];
      renderTabs();
    }
    if (changes.tabProfiles) {
      tabProfiles = changes.tabProfiles.newValue || [];
      renderProfiles();
    }
  });
});

async function loadData() {
  try {
    const data = await chrome.storage.local.get(["startupTabs", "tabProfiles"]);
    startupTabs = data.startupTabs || [];
    tabProfiles = data.tabProfiles || [];
    renderTabs();
    renderProfiles();
    console.log("MemoKit: Data loaded successfully", { tabs: startupTabs.length, profiles: tabProfiles.length });
  } catch (e) {
    console.error("MemoKit: Failed to load data", e);
    logToSystem("Failed to load settings data", e);
  }
}

function renderTabs() {
  const container = document.getElementById('tabs-container');
  container.innerHTML = '';

  if (startupTabs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Your startup list is empty. Add your first site!</p>
      </div>
    `;
    return;
  }

  startupTabs.forEach((tab, index) => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    item.draggable = true;
    item.dataset.index = index;

    item.innerHTML = `
      <div class="drag-handle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="21" x2="16" y2="21"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="5" x2="16" y2="5"/></svg>
      </div>
      <div class="tab-info">
        <h4>${tab.title || (function() {
          try { return new URL(tab.url).hostname; } catch(e) { return 'Invalid URL'; }
        })()}</h4>
        <p>${tab.url}</p>
      </div>
      <div class="tab-badges">
        ${tab.pinned ? '<span class="badge pinned">Pinned</span>' : ''}
      </div>
      <div class="tab-actions">
        <button class="action-btn edit" title="Edit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" title="Remove">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;

    // Drag and Drop
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);

    // Actions
    item.querySelector('.edit').addEventListener('click', () => openModal("Edit Startup Tab", index));
    item.querySelector('.delete').addEventListener('click', () => deleteTab(index));

    container.appendChild(item);
  });
}

// Modal logic
function openModal(title, index = -1) {
  editingIndex = index;
  document.getElementById('modal-title').textContent = title;
  
  const urlInput = document.getElementById('tab-url');
  const titleInput = document.getElementById('tab-title');
  const pinnedInput = document.getElementById('tab-pinned');

  if (index >= 0) {
    const tab = startupTabs[index];
    urlInput.value = tab.url;
    titleInput.value = tab.title || '';
    pinnedInput.checked = tab.pinned || false;
  } else {
    urlInput.value = '';
    titleInput.value = '';
    pinnedInput.checked = false;
  }

  document.getElementById('tab-modal').style.display = 'block';
  urlInput.focus();
}

function closeModal() {
  document.getElementById('tab-modal').style.display = 'none';
}

async function saveTab() {
  const url = document.getElementById('tab-url').value.trim();
  const title = document.getElementById('tab-title').value.trim();
  const pinned = document.getElementById('tab-pinned').checked;

  if (!url) {
    alert("Please enter a valid URL");
    return;
  }

  try {
    new URL(url); // Validate URL
  } catch (e) {
    alert("Invalid URL format. Please include http:// or https://");
    return;
  }

  const tabData = { url, title, pinned };

  if (editingIndex >= 0) {
    startupTabs[editingIndex] = tabData;
  } else {
    startupTabs.push(tabData);
  }

  await chrome.storage.local.set({ startupTabs });
  closeModal();
  renderTabs();
}

async function deleteTab(index) {
  if (!confirm("Remove this site from your startup list?")) return;
  startupTabs.splice(index, 1);
  await chrome.storage.local.set({ startupTabs });
  renderTabs();
}

// Profile logic
function renderProfiles() {
  const container = document.getElementById('profiles-container');
  if (!container) return;
  container.innerHTML = '';

  if (tabProfiles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>You haven't created any profiles yet. Categorize your URLs!</p>
      </div>
    `;
    return;
  }

  tabProfiles.forEach((profile, index) => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    item.dataset.index = index;

    item.innerHTML = `
      <div class="tab-item-header">
        <div class="tab-info">
          <h4>${profile.name}</h4>
          <p>${profile.urls.length} URLs saved</p>
        </div>
        <div class="tab-actions">
          <button class="action-btn launch" title="Launch Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg>
          </button>
          <button class="action-btn view" title="View URLs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-btn edit" title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete" title="Remove">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
      <div class="profile-urls-preview" style="display: none;">
        ${profile.urls.map(u => `<div class="url-preview-item">${u}</div>`).join('')}
      </div>
    `;

    item.querySelector('.launch').addEventListener('click', (e) => {
      e.stopPropagation();
      launchProfile(profile);
    });

    item.querySelector('.view').addEventListener('click', (e) => {
      e.stopPropagation();
      const preview = item.querySelector('.profile-urls-preview');
      const isHidden = preview.style.display === 'none';
      preview.style.display = isHidden ? 'flex' : 'none';
      item.classList.toggle('expanded', isHidden);
    });

    item.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openProfileModal("Edit Tab Profile", index);
    });

    item.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProfile(index);
    });

    container.appendChild(item);
  });
}

function launchProfile(profile) {
  if (confirm(`Switch workspace to "${profile.name}"? This will close your other unrelated tabs.`)) {
    chrome.runtime.sendMessage({ action: "switchToProfile", profile });
  }
}

function openProfileModal(title, index = -1) {
  editingProfileIndex = index;
  document.getElementById('profile-modal-title').textContent = title;
  
  const nameInput = document.getElementById('profile-name');
  const urlsInput = document.getElementById('profile-urls');

  if (index >= 0) {
    const profile = tabProfiles[index];
    nameInput.value = profile.name;
    urlsInput.value = profile.urls.join('\n');
  } else {
    nameInput.value = '';
    urlsInput.value = '';
  }

  document.getElementById('profile-modal').style.display = 'block';
  nameInput.focus();
}

function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
}

async function saveProfile() {
  const nameInput = document.getElementById('profile-name');
  const urlsInput = document.getElementById('profile-urls');
  const name = nameInput.value.trim();
  const urlsText = urlsInput.value.trim();

  if (!name) {
    alert("Please enter a profile name");
    return;
  }

  let urls = urlsText.split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0);

  if (urls.length === 0) {
    alert("Please add at least one URL");
    return;
  }

  // Robust URL validation and auto-fix
  const validatedUrls = [];
  for (let url of urls) {
    let processedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      processedUrl = 'https://' + url;
    }
    
    try {
      new URL(processedUrl);
      validatedUrls.push(processedUrl);
    } catch (e) {
      alert(`Invalid URL format: ${url}. Please ensure it is a valid web address.`);
      return;
    }
  }

  const profileData = { 
    id: editingProfileIndex >= 0 ? tabProfiles[editingProfileIndex].id : Date.now().toString(),
    name, 
    urls: validatedUrls 
  };

  try {
    if (editingProfileIndex >= 0) {
      tabProfiles[editingProfileIndex] = profileData;
    } else {
      tabProfiles.push(profileData);
    }

    await chrome.storage.local.set({ tabProfiles });
    console.log("MemoKit: Profile saved", profileData);
    closeProfileModal();
    renderProfiles();
  } catch (err) {
    console.error("MemoKit: Failed to save profile", err);
    alert("Error saving profile: " + err.message);
  }
}

async function logToSystem(msg, error = null) {
  const { logs = [] } = await chrome.storage.local.get("logs");
  logs.push({ 
      time: new Date().toISOString(), 
      msg, 
      error: error?.message || String(error || "") 
  });
  await chrome.storage.local.set({ logs: logs.slice(-50) });
}

async function deleteProfile(index) {
  if (!confirm("Delete this profile?")) return;
  tabProfiles.splice(index, 1);
  await chrome.storage.local.set({ tabProfiles });
  renderProfiles();
}

async function exportData() {
  const data = await chrome.storage.local.get(null);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `memokit-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (confirm("This will overwrite your current settings. Continue?")) {
        await chrome.storage.local.clear();
        await chrome.storage.local.set(data);
        location.reload();
      }
    } catch (err) {
      alert("Invalid backup file: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Simple Drag and Drop implementation
let dragSrcIndex = -1;

function handleDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index);
  this.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  return false;
}

async function handleDrop(e) {
  e.stopPropagation();
  const targetIndex = parseInt(this.dataset.index);
  
  if (dragSrcIndex !== targetIndex) {
    const itemToMove = startupTabs.splice(dragSrcIndex, 1)[0];
    startupTabs.splice(targetIndex, 0, itemToMove);
    await chrome.storage.local.set({ startupTabs });
    renderTabs();
  }
}

function handleDragEnd() {
  this.style.opacity = '1';
}

async function loadLogs() {
  const { logs = [] } = await chrome.storage.local.get("logs");
  const logContainer = document.getElementById('debug-logs');
  if (!logContainer) return;

  if (logs.length === 0) {
    logContainer.innerHTML = '<p class="no-logs">No system logs found.</p>';
    return;
  }

  logContainer.innerHTML = logs.reverse().map(log => `
    <div class="log-entry">
      <span class="log-time">${new Date(log.time).toLocaleTimeString()}</span>
      <span class="log-msg">${log.msg}</span>
      ${log.error ? `<pre class="log-error">${log.error}</pre>` : ''}
    </div>
  `).join('');
}
