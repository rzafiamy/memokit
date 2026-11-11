/**
 * MemoKit - small, dependency-free helpers (safe to import from any context).
 */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape a value for safe interpolation into HTML template strings. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
