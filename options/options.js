/**
 * MemoKit - Options Script
 * Handles managing startup tabs and extension settings.
 */

let startupTabs = [];
let editingIndex = -1;

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-tab');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      item.classList.add('active');
      document.getElementById(target).classList.add('active');

      if (target === 'about') {
        loadLogs();
      }
    });
  });

  // Load Data
  await loadData();

  // Add Button
  document.getElementById('add-tab-btn').addEventListener('click', () => {
    openModal("Add Startup Tab");
  });

  // Modal Actions
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-tab-btn').addEventListener('click', saveTab);

  // Auto-Cleanup Toggle
  const cleanupToggle = document.getElementById('auto-cleanup-toggle');
  cleanupToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoCleanup: e.target.checked });
  });

  // Initial UI state for toggle
  const { autoCleanup = true } = await chrome.storage.local.get("autoCleanup");
  cleanupToggle.checked = autoCleanup;
});

async function loadData() {
  const data = await chrome.storage.local.get("startupTabs");
  startupTabs = data.startupTabs || [];
  renderTabs();
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
        <h4>${tab.title || new URL(tab.url).hostname}</h4>
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
