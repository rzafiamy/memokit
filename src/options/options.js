/**
 * MemoKit - Options Script
 * Manages startup tabs, tab profiles, settings, backup and logs.
 */
import { OPEN_MODES, PROFILE_COLORS, STORAGE_KEYS, profileColor } from "../shared/constants.js";
import * as store from "../shared/storage.js";
import { requestOpenProfile } from "../shared/messages.js";
import { showAlert, showConfirm } from "../shared/dialog.js";
import { displayUrl, ensureHttpUrl, hostnameOf, isInternalUrl } from "../shared/url.js";
import { escapeHtml } from "../shared/utils.js";
import { log, logError } from "../shared/logger.js";

const $ = (id) => document.getElementById(id);

const ICONS = {
  drag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="21" x2="16" y2="21"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="5" x2="16" y2="5"/></svg>',
  edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  delete: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  launch: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg>',
  duplicate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  view: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
};

const state = {
  startupTabs: [],
  profiles: [],
  editingTabIndex: -1,
  editingProfileIndex: -1,
  editingProfileColor: null,
  profileFilter: "",
  dragSrcIndex: -1,
};

/* ================================================================== */
/* Navigation                                                          */
/* ================================================================== */

function switchSection(target) {
  const navItems = document.querySelectorAll(".nav-item");
  const navItem = [...navItems].find((i) => i.dataset.tab === target);
  if (!navItem) return;

  navItems.forEach((n) => n.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  navItem.classList.add("active");
  $(target)?.classList.add("active");

  if (target === "about") renderLogs();
}

/* ================================================================== */
/* Startup tabs                                                        */
/* ================================================================== */

function renderTabs() {
  const container = $("tabs-container");
  if (state.startupTabs.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Your startup list is empty. Add your first site!</p></div>';
    return;
  }

  container.replaceChildren(...state.startupTabs.map((tab, index) => {
    const item = document.createElement("div");
    item.className = "tab-item";
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = `
      <div class="drag-handle">${ICONS.drag}</div>
      <div class="tab-info">
        <h4>${escapeHtml(tab.title || hostnameOf(tab.url))}</h4>
        <p>${escapeHtml(tab.url)}</p>
      </div>
      <div class="tab-badges">${tab.pinned ? '<span class="badge pinned">Pinned</span>' : ""}</div>
      <div class="tab-actions">
        <button class="action-btn edit" title="Edit">${ICONS.edit}</button>
        <button class="action-btn delete" title="Remove">${ICONS.delete}</button>
      </div>`;

    item.addEventListener("dragstart", onDragStart);
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", onDrop);
    item.addEventListener("dragend", onDragEnd);

    item.querySelector(".edit").addEventListener("click", () => openTabModal("Edit Startup Tab", index));
    item.querySelector(".delete").addEventListener("click", () => deleteTab(index));
    return item;
  }));
}

function openTabModal(title, index = -1) {
  state.editingTabIndex = index;
  const tab = state.startupTabs[index] ?? {};
  $("modal-title").textContent = title;
  $("tab-url").value = tab.url ?? "";
  $("tab-title").value = tab.title ?? "";
  $("tab-pinned").checked = !!tab.pinned;
  $("tab-modal").style.display = "block";
  $("tab-url").focus();
}

const closeTabModal = () => { $("tab-modal").style.display = "none"; };

async function saveTab() {
  const url = $("tab-url").value.trim();
  if (!url) return showAlert("Error", "Please enter a valid URL");
  try {
    new URL(url);
  } catch {
    return showAlert("Error", "Invalid URL format. Please include http:// or https://");
  }

  const tab = { url, title: $("tab-title").value.trim(), pinned: $("tab-pinned").checked };
  if (state.editingTabIndex >= 0) state.startupTabs[state.editingTabIndex] = tab;
  else state.startupTabs.push(tab);

  await store.setStartupTabs(state.startupTabs);
  closeTabModal();
  renderTabs();
}

async function deleteTab(index) {
  if (!(await showConfirm("Remove Site", "Remove this site from your startup list?"))) return;
  state.startupTabs.splice(index, 1);
  await store.setStartupTabs(state.startupTabs);
  renderTabs();
}

/* Drag and drop reordering */

function onDragStart(e) {
  state.dragSrcIndex = Number(this.dataset.index);
  this.style.opacity = "0.4";
  e.dataTransfer.effectAllowed = "move";
}

async function onDrop(e) {
  e.stopPropagation();
  const target = Number(this.dataset.index);
  if (state.dragSrcIndex === target) return;
  const [moved] = state.startupTabs.splice(state.dragSrcIndex, 1);
  state.startupTabs.splice(target, 0, moved);
  await store.setStartupTabs(state.startupTabs);
  renderTabs();
}

function onDragEnd() {
  this.style.opacity = "1";
}

/* ================================================================== */
/* Profiles                                                            */
/* ================================================================== */

function renderProfiles() {
  const container = $("profiles-container");
  if (state.profiles.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No profiles yet. Create one here, or open your tabs and use <b>Save window</b> in the popup.</p></div>';
    return;
  }

  const filter = state.profileFilter.trim().toLowerCase();
  const matches = (profile) => !filter || profile.name.toLowerCase().includes(filter)
    || profile.urls.some((u) => u.toLowerCase().includes(filter));
  const visible = state.profiles.map((profile, index) => ({ profile, index })).filter(({ profile }) => matches(profile));

  if (visible.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No profile matches this filter.</p></div>';
    return;
  }

  container.replaceChildren(...visible.map(({ profile, index }) => {
    const item = document.createElement("div");
    item.className = "tab-item";
    item.dataset.index = index;
    const expanded = !!filter && !profile.name.toLowerCase().includes(filter);
    item.innerHTML = `
      <div class="tab-item-header">
        <div class="tab-info">
          <h4><span class="profile-dot" style="--c:${profileColor(profile)}"></span>${escapeHtml(profile.name)}</h4>
          <p>${profile.urls.length} site${profile.urls.length === 1 ? "" : "s"} · ${escapeHtml(profile.urls.slice(0, 3).map(displayUrl).join(", "))}${profile.urls.length > 3 ? "…" : ""}</p>
        </div>
        <div class="tab-actions">
          <button class="action-btn launch" title="Open in a new window">${ICONS.launch}</button>
          <button class="action-btn view" title="Show sites">${ICONS.view}</button>
          <button class="action-btn edit" title="Edit">${ICONS.edit}</button>
          <button class="action-btn duplicate" title="Duplicate">${ICONS.duplicate}</button>
          <button class="action-btn delete" title="Delete">${ICONS.delete}</button>
        </div>
      </div>
      <div class="profile-urls-preview" style="display: ${expanded ? "flex" : "none"};">
        ${profile.urls.map((u) => `<div class="url-preview-item">${escapeHtml(u)}</div>`).join("")}
      </div>`;
    item.classList.toggle("expanded", expanded);

    const on = (selector, fn) => item.querySelector(selector).addEventListener("click", (e) => {
      e.stopPropagation();
      fn();
    });
    on(".launch", () => requestOpenProfile(profile, OPEN_MODES.WINDOW));
    on(".view", () => {
      const preview = item.querySelector(".profile-urls-preview");
      const show = preview.style.display === "none";
      preview.style.display = show ? "flex" : "none";
      item.classList.toggle("expanded", show);
    });
    on(".edit", () => openProfileModal("Edit Profile", index));
    on(".duplicate", () => duplicateProfile(index));
    on(".delete", () => deleteProfile(index));
    return item;
  }));
}

async function duplicateProfile(index) {
  const source = state.profiles[index];
  const copy = { ...source, id: Date.now().toString(), name: `${source.name} (copy)`, urls: [...source.urls] };
  state.profiles.splice(index + 1, 0, copy);
  await store.setProfiles(state.profiles);
  renderProfiles();
  openProfileModal("Edit Profile", index + 1);
}

function renderColorPicker() {
  const current = state.editingProfileColor;
  $("profile-colors").replaceChildren(...Object.entries(PROFILE_COLORS).map(([name, css]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-swatch";
    btn.title = name;
    btn.style.setProperty("--c", css);
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", String(name === current));
    btn.addEventListener("click", () => { state.editingProfileColor = name; renderColorPicker(); });
    return btn;
  }));
}

function updateUrlCount() {
  const n = $("profile-urls").value.split("\n").filter((l) => l.trim()).length;
  $("profile-url-count").textContent = n ? `${n} site${n === 1 ? "" : "s"}` : "";
}

function openProfileModal(title, index = -1) {
  state.editingProfileIndex = index;
  const profile = state.profiles[index];
  const fallback = Object.keys(PROFILE_COLORS)[state.profiles.length % Object.keys(PROFILE_COLORS).length];
  state.editingProfileColor = profile?.color
    ?? (profile ? Object.keys(PROFILE_COLORS).find((k) => PROFILE_COLORS[k] === profileColor(profile)) : fallback);
  $("profile-modal-title").textContent = title;
  $("profile-name").value = profile?.name ?? "";
  $("profile-urls").value = profile?.urls.join("\n") ?? "";
  renderColorPicker();
  updateUrlCount();
  $("profile-modal").style.display = "block";
  $("profile-name").focus();
}

/** Fill the URL list with the web pages open in this window. */
async function fillFromWindow() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const urls = [...new Set(tabs.map((t) => t.url).filter((u) => !isInternalUrl(u)))];
  if (urls.length === 0) return showAlert("Nothing to add", "This window has no web pages open.");
  const existing = $("profile-urls").value.trim();
  $("profile-urls").value = existing ? `${existing}\n${urls.join("\n")}` : urls.join("\n");
  updateUrlCount();
}

const closeProfileModal = () => { $("profile-modal").style.display = "none"; };

async function saveProfile() {
  const name = $("profile-name").value.trim();
  if (!name) return showAlert("Error", "Please enter a profile name");

  const rawUrls = $("profile-urls").value.split("\n").map((u) => u.trim()).filter(Boolean);
  if (rawUrls.length === 0) return showAlert("Error", "Please add at least one URL");

  const urls = [];
  for (const raw of rawUrls) {
    const fixed = ensureHttpUrl(raw);
    if (!fixed) return showAlert("Error", `Invalid URL format: ${raw}. Please ensure it is a valid web address.`);
    if (!urls.includes(fixed)) urls.push(fixed); // drop duplicates
  }

  const editing = state.editingProfileIndex >= 0;
  const profile = {
    ...(editing ? state.profiles[state.editingProfileIndex] : {}),
    id: editing ? state.profiles[state.editingProfileIndex].id : Date.now().toString(),
    name,
    color: state.editingProfileColor,
    urls,
  };

  try {
    if (editing) state.profiles[state.editingProfileIndex] = profile;
    else state.profiles.push(profile);
    await store.setProfiles(state.profiles);
    log("Profile saved", profile);
    closeProfileModal();
    renderProfiles();
  } catch (err) {
    await logError("Failed to save profile", err);
    showAlert("Error", `Error saving profile: ${err.message}`);
  }
}

async function deleteProfile(index) {
  if (!(await showConfirm("Delete Profile", "Delete this profile?"))) return;
  state.profiles.splice(index, 1);
  await store.setProfiles(state.profiles);
  renderProfiles();
}

/* ================================================================== */
/* Backup & logs                                                       */
/* ================================================================== */

async function exportData() {
  const data = await store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `memokit-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e) {
  const file = e.target.files[0];
  e.target.value = ""; // allow re-importing the same file
  if (!file) return;

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (err) {
    return showAlert("Import Failed", `Invalid backup file: ${err.message}`);
  }
  if (await showConfirm("Import Backup", "This will overwrite your current settings. Continue?")) {
    await store.importAll(data);
    location.reload();
  }
}

async function renderLogs() {
  const container = $("debug-logs");
  const logs = await store.getLogs();
  if (logs.length === 0) {
    container.innerHTML = '<p class="no-logs">No system logs found.</p>';
    return;
  }
  container.innerHTML = logs.reverse().map((entry) => `
    <div class="log-entry">
      <span class="log-time">${new Date(entry.time).toLocaleTimeString()}</span>
      <span class="log-msg">${escapeHtml(entry.msg)}</span>
      ${entry.error ? `<pre class="log-error">${escapeHtml(entry.error)}</pre>` : ""}
    </div>`).join("");
}

/* ================================================================== */
/* Init                                                                */
/* ================================================================== */

async function loadData() {
  try {
    [state.startupTabs, state.profiles] = await Promise.all([store.getStartupTabs(), store.getProfiles()]);
    renderTabs();
    renderProfiles();
    log("Data loaded", { tabs: state.startupTabs.length, profiles: state.profiles.length });
  } catch (e) {
    await logError("Failed to load settings data", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("version").textContent = chrome.runtime.getManifest().version;

  document.querySelectorAll(".nav-item").forEach((item) =>
    item.addEventListener("click", () => switchSection(item.dataset.tab)));
  if (location.hash) switchSection(location.hash.slice(1));

  $("add-tab-btn").addEventListener("click", () => openTabModal("Add Startup Tab"));
  $("cancel-btn").addEventListener("click", closeTabModal);
  $("save-tab-btn").addEventListener("click", saveTab);

  $("add-profile-btn").addEventListener("click", () => openProfileModal("Create Profile"));
  $("fill-from-window-btn").addEventListener("click", fillFromWindow);
  $("profile-urls").addEventListener("input", updateUrlCount);
  $("profile-filter").addEventListener("input", (e) => { state.profileFilter = e.target.value; renderProfiles(); });

  // Enter saves in the name field, Ctrl+Enter anywhere in a modal; Escape closes.
  $("profile-name").addEventListener("keydown", (e) => { if (e.key === "Enter") saveProfile(); });
  document.addEventListener("keydown", (e) => {
    const profileOpen = $("profile-modal").style.display === "block";
    const tabOpen = $("tab-modal").style.display === "block";
    if (e.key === "Escape") { closeProfileModal(); closeTabModal(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      if (profileOpen) saveProfile();
      else if (tabOpen) saveTab();
    }
  });
  $("profile-cancel-btn").addEventListener("click", closeProfileModal);
  $("save-profile-btn").addEventListener("click", saveProfile);

  $("export-btn").addEventListener("click", exportData);
  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", importData);

  const modeSelect = $("open-mode-select");
  modeSelect.value = await store.getOpenMode();
  modeSelect.addEventListener("change", (e) => store.setOpenMode(e.target.value));
  $("shortcuts-btn").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

  const cleanupToggle = $("auto-cleanup-toggle");
  cleanupToggle.checked = await store.getAutoCleanup();
  cleanupToggle.addEventListener("change", (e) => store.setAutoCleanup(e.target.checked));

  // Keep in sync with changes made elsewhere (e.g. profile saved from the popup).
  store.onKeyChanged(STORAGE_KEYS.STARTUP_TABS, (v) => { state.startupTabs = v || []; renderTabs(); });
  store.onKeyChanged(STORAGE_KEYS.TAB_PROFILES, (v) => { state.profiles = v || []; renderProfiles(); });

  await loadData();
});
