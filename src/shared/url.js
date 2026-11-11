/**
 * MemoKit - URL helpers.
 */

/**
 * Normalize a URL for equality comparison: lowercase, no trailing slash,
 * no hash. Falls back to the trimmed lowercase string for unparsable input.
 */
export function normalizeUrl(input) {
  if (!input) return "";
  try {
    const url = new URL(input);
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return (url.origin + path + url.search).toLowerCase().trim();
  } catch {
    return String(input).toLowerCase().trim();
  }
}

/** True for browser-internal pages (chrome://, about:, chrome-extension://, ...). */
export function isInternalUrl(url) {
  return !url || url.startsWith("chrome") || url.startsWith("about");
}

/** Hostname of a URL, or a fallback label if it cannot be parsed. */
export function hostnameOf(url, fallback = "Invalid URL") {
  try {
    return new URL(url).hostname;
  } catch {
    return fallback;
  }
}

/**
 * Add an https:// scheme when missing and validate.
 * @returns {string|null} the fixed URL, or null if still invalid.
 */
export function ensureHttpUrl(input) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/** Short, human-friendly form of a URL: no scheme, no "www.", no trailing slash. */
export function displayUrl(url) {
  return String(url ?? "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}
