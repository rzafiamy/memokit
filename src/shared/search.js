/**
 * MemoKit - search over profiles and the sites they contain.
 * Pure functions (no chrome.* calls) so they can be unit-tested and shared by
 * the popup and the omnibox.
 */
import { displayUrl, normalizeUrl } from "./url.js";

/**
 * @typedef {{type: "profile", id: string, label: string, profile: object, haystack: string}} ProfileEntry
 * @typedef {{type: "site", id: string, label: string, url: string, profiles: string[], haystack: string}} SiteEntry
 */

/** Build a search index from profiles and startup tabs. Sites are de-duplicated. */
export function buildIndex(profiles = [], startupTabs = []) {
  const entries = [];
  const sites = new Map();

  const addSite = (url, origin, title) => {
    if (!url) return;
    const key = normalizeUrl(url);
    const site = sites.get(key) ?? { type: "site", id: key, url, label: title || displayUrl(url), profiles: [] };
    if (origin && !site.profiles.includes(origin)) site.profiles.push(origin);
    sites.set(key, site);
  };

  for (const profile of profiles) {
    entries.push({ type: "profile", id: profile.id, label: profile.name, profile, haystack: profile.name.toLowerCase() });
    for (const url of profile.urls ?? []) addSite(url, profile.name);
  }
  for (const tab of startupTabs) addSite(tab.url, "Startup", tab.title);

  for (const site of sites.values()) {
    site.haystack = `${site.label} ${displayUrl(site.url)} ${site.profiles.join(" ")}`.toLowerCase();
    entries.push(site);
  }
  return entries;
}

function score(entry, query) {
  const label = entry.label.toLowerCase();
  let s = 0;
  if (label === query) s += 100;
  else if (label.startsWith(query)) s += 50;
  else if (label.split(/[\s.\-_/:]+/).some((w) => w.startsWith(query))) s += 30;
  else if (label.includes(query)) s += 20;
  if (entry.type === "profile") s += 5;
  return s;
}

/**
 * Search the index. Every whitespace-separated term must match.
 * An empty query returns all profiles (in their saved order).
 */
export function search(index, rawQuery, limit = 50) {
  const query = String(rawQuery ?? "").trim().toLowerCase();
  if (!query) return index.filter((e) => e.type === "profile").slice(0, limit);

  const terms = query.split(/\s+/);
  return index
    .filter((e) => terms.every((t) => e.haystack.includes(t)))
    .map((e) => ({ e, s: score(e, query) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ e }) => e);
}

/** How many of `urls` are currently open, given the open tabs' URLs. */
export function countOpen(urls = [], openUrls = []) {
  const open = new Set(openUrls.map(normalizeUrl));
  return urls.filter((u) => open.has(normalizeUrl(u))).length;
}
