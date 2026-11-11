/**
 * MemoKit - Popup: a keyboard-driven launcher for profiles and sites.
 *
 *   type to search · ↑/↓ select · ↵ open (default mode)
 *   ⇧↵ new window · Ctrl/⌘↵ add to this window · Esc clear
 */
import { OPEN_MODES, OPTIONS_PAGE, profileColor } from "../shared/constants.js";
import * as store from "../shared/storage.js";
import { requestOpenProfile, requestOpenUrl, requestRestore, requestUndoSwitch } from "../shared/messages.js";
import { showAlert, showConfirm } from "../shared/dialog.js";
import { buildIndex, countOpen, search } from "../shared/search.js";
import { displayUrl, isInternalUrl, normalizeUrl } from "../shared/url.js";
import { escapeHtml } from "../shared/utils.js";
import { log } from "../shared/logger.js";

const $ = (id) => document.getElementById(id);

const ICONS = {
  window: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>',
  append: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  replace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
};

const MODE_LABELS = {
  [OPEN_MODES.REPLACE]: "replace window",
  [OPEN_MODES.WINDOW]: "new window",
  [OPEN_MODES.APPEND]: "add here",
};

const state = {
  index: [],
  results: [],
  selected: 0,
  openUrls: [],
};

/* ================================================================== */
/* Rendering                                                           */
/* ================================================================== */

function openBadge(urls) {
  const open = countOpen(urls, state.openUrls);
  const cls = open === 0 ? "" : open === urls.length ? "full" : "partial";
  const title = open === 0 ? "None open" : `${open} of ${urls.length} sites open`;
  return `<span class="badge ${cls}" title="${title}">${open ? `${open}/` : ""}${urls.length}</span>`;
}

function profileRow(entry) {
  const { profile } = entry;
  const sites = profile.urls.map(displayUrl).join(", ");
  return `
    <span class="dot" style="--c:${profileColor(profile)}"></span>
    <div class="main">
      <span class="name">${escapeHtml(profile.name)}</span>
      <span class="meta">${escapeHtml(sites)}</span>
    </div>
    <div class="row-actions">
      <button data-mode="${OPEN_MODES.WINDOW}" title="Open in a new window (⇧↵)">${ICONS.window}</button>
      <button data-mode="${OPEN_MODES.APPEND}" title="Add to this window (Ctrl↵)">${ICONS.append}</button>
      <button data-mode="${OPEN_MODES.REPLACE}" title="Replace this window's tabs">${ICONS.replace}</button>
    </div>
    ${openBadge(profile.urls)}`;
}

function siteRow(entry) {
  const isOpen = state.openUrls.some((u) => normalizeUrl(u) === entry.id);
  return `
    <span class="site-icon">${ICONS.globe}</span>
    <div class="main">
      <span class="name">${escapeHtml(entry.label)}</span>
      <span class="meta">${escapeHtml(entry.profiles.join(" · "))}</span>
    </div>
    <div class="row-actions">
      <button data-mode="${OPEN_MODES.WINDOW}" title="Open in a new window (⇧↵)">${ICONS.window}</button>
    </div>
    ${isOpen ? '<span class="badge full" title="Already open: Enter switches to it">open</span>' : ""}`;
}

function render() {
  const container = $("results");
  const query = $("search").value.trim();
  $("list-title").textContent = query ? `${state.results.length} result${state.results.length === 1 ? "" : "s"}` : "Profiles";

  if (state.results.length === 0) {
    container.innerHTML = query
      ? '<p class="empty">No profile or site matches.</p>'
      : '<p class="empty">No profiles yet. Open your tabs, then click <b>Save window</b>,<br>or <a href="#" data-manage>create one in the settings</a>.</p>';
    container.querySelector("[data-manage]")?.addEventListener("click", (e) => openOptions(e, "profiles"));
    return;
  }

  container.replaceChildren(...state.results.map((entry, i) => {
    const row = document.createElement("div");
    row.className = `row ${entry.type}${i === state.selected ? " selected" : ""}`;
    row.setAttribute("role", "option");
    row.title = entry.type === "site" ? entry.url : "";
    row.innerHTML = entry.type === "profile" ? profileRow(entry) : siteRow(entry);
    row.addEventListener("click", (e) => {
      const modeBtn = e.target.closest("button[data-mode]");
      activate(entry, modeBtn?.dataset.mode);
    });
    row.addEventListener("mousemove", () => select(i, false));
    return row;
  }));
}

function select(index, scroll = true) {
  if (state.results.length === 0) return;
  state.selected = (index + state.results.length) % state.results.length;
  const rows = $("results").children;
  [...rows].forEach((r, i) => r.classList.toggle("selected", i === state.selected));
  if (scroll) rows[state.selected]?.scrollIntoView({ block: "nearest" });
}

function runSearch() {
  state.results = search(state.index, $("search").value);
  state.selected = 0;
  render();
}

/* ================================================================== */
/* Actions                                                             */
/* ================================================================== */

/** Open a profile or a site. `mode` undefined = user's default mode. */
async function activate(entry, mode) {
  if (!entry) return;
  if (entry.type === "profile") await requestOpenProfile(entry.profile, mode);
  else await requestOpenUrl(entry.url, mode);
  window.close();
}

function modeFromEvent(e) {
  if (e.shiftKey) return OPEN_MODES.WINDOW;
  if (e.ctrlKey || e.metaKey) return OPEN_MODES.APPEND;
  return undefined;
}

function onSearchKey(e) {
  switch (e.key) {
    case "ArrowDown": e.preventDefault(); select(state.selected + 1); break;
    case "ArrowUp": e.preventDefault(); select(state.selected - 1); break;
    case "Enter": e.preventDefault(); activate(state.results[state.selected], modeFromEvent(e)); break;
    case "Escape":
      if (e.target.value) { e.preventDefault(); e.target.value = ""; runSearch(); }
      break;
  }
}

/** Show the loading -> success animation on a toolbar button. */
async function withButtonFeedback(button, action) {
  button.classList.add("loading");
  const ok = await action();
  button.classList.remove("loading");
  if (ok === false) return;
  button.classList.add("success");
  setTimeout(() => button.classList.remove("success"), 1500);
}

const currentWindowTabs = () => chrome.tabs.query({ currentWindow: true });

async function captureAsStartup() {
  if (!(await showConfirm("Set startup tabs", "Replace your startup list with the tabs of this window?"))) return;
  await withButtonFeedback($("capture-btn"), async () => {
    const tabs = (await currentWindowTabs()).filter((t) => !isInternalUrl(t.url));
    await store.setStartupTabs(tabs.map((t) => ({ url: t.url, pinned: t.pinned, title: t.title })));
  });
}

function restoreStartup() {
  return withButtonFeedback($("restore-btn"), async () => !!(await requestRestore())?.success);
}

async function closeOtherTabs() {
  const tabs = await currentWindowTabs();
  const active = tabs.find((t) => t.active);
  const otherIds = tabs.filter((t) => t.id !== active?.id && !t.pinned).map((t) => t.id);
  if (otherIds.length === 0) return showAlert("Nothing to close", "There are no other non-pinned tabs in this window.");
  if (await showConfirm("Close tabs", `Close ${otherIds.length} other tabs? Pinned tabs are kept.`)) {
    await chrome.tabs.remove(otherIds);
    window.close();
  }
}

/* Save window as profile */

function toggleSaveForm(visible) {
  $("save-profile-form").hidden = !visible;
  if (visible) $("new-profile-name").focus();
  else { $("new-profile-name").value = ""; $("search").focus(); }
}

async function saveWindowAsProfile() {
  const name = $("new-profile-name").value.trim();
  if (!name) return showAlert("Name required", "Please enter a profile name.");

  const urls = [...new Set((await currentWindowTabs()).map((t) => t.url).filter((u) => !isInternalUrl(u)))];
  if (urls.length === 0) return showAlert("Nothing to save", "This window has no web pages to save.");

  const profiles = await store.getProfiles();
  const existing = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (!(await showConfirm("Update profile", `"${existing.name}" already exists. Replace its ${existing.urls.length} sites with the ${urls.length} tabs of this window?`))) return;
    existing.urls = urls;
    log("Profile updated", existing.name);
  } else {
    profiles.push({ id: Date.now().toString(), name, urls });
    log("Profile created", name);
  }
  await store.setProfiles(profiles);
  toggleSaveForm(false);
  await loadIndex();
  $("search").value = name;
  runSearch();
}

/* Undo */

function timeAgo(time) {
  const min = Math.round((Date.now() - time) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

async function renderUndo() {
  const snapshot = await store.getSnapshot();
  const banner = $("undo-banner");
  banner.hidden = !snapshot?.tabs?.length;
  if (banner.hidden) return;
  $("undo-text").textContent = `${snapshot.tabs.length} tabs closed ${snapshot.label ? snapshot.label.replace(/^Before/, "before") : ""} · ${timeAgo(snapshot.time)}`;
}

async function undo() {
  await requestUndoSwitch();
  window.close();
}

function openOptions(event, section = "profiles") {
  event?.preventDefault();
  chrome.tabs.create({ url: `${chrome.runtime.getURL(OPTIONS_PAGE)}#${section}` });
  window.close();
}

/* ================================================================== */
/* Init                                                                */
/* ================================================================== */

async function loadIndex() {
  const [profiles, startupTabs, tabs] = await Promise.all([
    store.getProfiles(), store.getStartupTabs(), chrome.tabs.query({}),
  ]);
  state.index = buildIndex(profiles, startupTabs);
  state.openUrls = tabs.map((t) => t.url || t.pendingUrl).filter(Boolean);
  $("profile-datalist").innerHTML = profiles.map((p) => `<option value="${escapeHtml(p.name)}">`).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  $("version").textContent = `v${chrome.runtime.getManifest().version}`;

  const search = $("search");
  search.addEventListener("input", runSearch);
  search.addEventListener("keydown", onSearchKey);

  $("save-profile-btn").addEventListener("click", () => toggleSaveForm($("save-profile-form").hidden));
  $("cancel-save-profile").addEventListener("click", () => toggleSaveForm(false));
  $("confirm-save-profile").addEventListener("click", saveWindowAsProfile);
  $("new-profile-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveWindowAsProfile();
    if (e.key === "Escape") { e.preventDefault(); toggleSaveForm(false); }
  });

  $("restore-btn").addEventListener("click", restoreStartup);
  $("capture-btn").addEventListener("click", captureAsStartup);
  $("close-others-btn").addEventListener("click", closeOtherTabs);
  $("undo-btn").addEventListener("click", undo);
  $("open-settings").addEventListener("click", (e) => openOptions(e, "settings"));
  $("manage-profiles").addEventListener("click", (e) => openOptions(e, "profiles"));

  const defaultMode = await store.getOpenMode();
  document.querySelector(".hints span").innerHTML = `<kbd>↵</kbd> ${MODE_LABELS[defaultMode]}`;

  await Promise.all([loadIndex(), renderUndo()]);
  runSearch();
  search.focus();
});
