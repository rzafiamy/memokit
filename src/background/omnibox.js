/**
 * MemoKit - address bar integration: type "mk <search>" then Enter.
 * Alt+Enter (new tab disposition) opens the result in a new window.
 */
import { OPEN_MODES } from "../shared/constants.js";
import { getProfiles, getStartupTabs } from "../shared/storage.js";
import { buildIndex, search } from "../shared/search.js";
import { openProfile, openUrl } from "./profiles.js";

const PROFILE_PREFIX = "profile:";

const xml = (s) => String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

async function loadIndex() {
  const [profiles, startupTabs] = await Promise.all([getProfiles(), getStartupTabs()]);
  return buildIndex(profiles, startupTabs);
}

function toSuggestion(entry) {
  if (entry.type === "profile") {
    return {
      content: PROFILE_PREFIX + entry.id,
      description: `<match>${xml(entry.label)}</match> <dim>· profile · ${entry.profile.urls.length} sites</dim>`,
    };
  }
  return {
    content: entry.url,
    description: `${xml(entry.label)} <dim>· ${xml(entry.profiles.join(", "))}</dim> <url>${xml(entry.url)}</url>`,
  };
}

async function openEntry(entry, mode) {
  if (entry.type === "profile") return openProfile(entry.profile, mode);
  return openUrl(entry.url, mode);
}

export function registerOmnibox() {
  if (!chrome.omnibox) return;
  chrome.omnibox.setDefaultSuggestion({ description: "MemoKit: search your profiles and sites" });

  chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    const results = search(await loadIndex(), text, 8);
    suggest(results.map(toSuggestion));
  });

  chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
    const mode = disposition === "currentTab" ? undefined : OPEN_MODES.WINDOW;
    const index = await loadIndex();

    if (text.startsWith(PROFILE_PREFIX)) {
      const entry = index.find((e) => e.type === "profile" && e.id === text.slice(PROFILE_PREFIX.length));
      if (entry) return openEntry(entry, mode);
    }
    if (/^https?:\/\//i.test(text)) return openUrl(text, mode);

    const [best] = search(index, text, 1);
    if (best) return openEntry(best, mode);
  });
}
