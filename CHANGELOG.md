# Changelog

All notable changes to MemoKit are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [1.3.0] - 2026-11-11

### Added
- **Launcher popup**: one search over profiles and individual sites, with keyboard navigation
  (↑/↓, ↵, ⇧↵ new window, Ctrl↵ add here, Esc). Opens with <kbd>Alt</kbd>+<kbd>M</kbd>.
- Opening a site switches to its tab if it is already open in any window.
- Three profile open modes (replace / new window / add) and a default-mode setting.
- **Undo** for the last profile switch (popup banner, <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>).
- Address bar keyword `mk` to search and open profiles and sites.
- Profile colors, open/total counter per profile, duplicate, filter, and "Use tabs of this window" in the editor.
- Keyboard shortcuts setting card. Enter/Ctrl+Enter/Esc in the editors.

### Changed
- Replacing a window with a profile now keeps pinned tabs, and keeps profile tabs that are already open (no reload).
- Auto-cleanup at startup no longer closes pinned tabs.
- The "Sync Enabled" setting card (incorrect, since data is stored locally) is replaced by a "Local storage only" card.
- Service worker split into modules: `restore`, `profiles`, `omnibox`, `windows`.
- License changed from Apache 2.0 to MIT.
- New logo: crisp vector icon (`assets/*.svg`), with a simplified 16px variant; regenerate PNGs with `npm run icons`.
- Professional README, plus a new `CREDITS.md`.
- Project restructured: extension source in `src/`, code shared between pages in `src/shared/` (ES modules).
- npm-based tooling (no dependencies): `npm run check`, `test`, `build`, `package`; `deploy.sh` removed.
- Version is set only in `package.json`; `npm version` syncs it into the manifest, and the UI reads it at runtime.
- Options page now uses the same in-page dialog as the popup instead of browser `alert`/`confirm`.

### Fixed
- User data (profile names, URLs, log messages) is now HTML-escaped before rendering.
- Restore retry no longer re-enters its own lock when no browser window is available yet.
- Re-importing the same backup file now works.

## [1.2.0]

### What's New
- **Profile Viewer Dashboard**: You can now view URLs inside any Tab Profile directly from the options page using the new "View" (Eye) toggle.
- **Quick-Launch from Settings**: Added a direct launch button to the Profiles list, allowing you to switch workspaces without opening the popup.
- **"Close Others" Shortcut**: A new productivity icon in the popup that clears all non-essential tabs while keeping your active tab and all pinned tabs safe.

### Improvements & Stability
- **Safer Workspace Switching**: The background service worker now intelligently avoids closing the Options page during profile transitions.
- **Pinned Tab Protection**: Automated cleanup and "Close Others" actions now preserve your pinned tabs by default.
- **Bug Fixes**:
  - Resolved a fatal `startsWith` TypeError that occurred when visiting internal or privileged browser pages.
  - Fixed a race condition where the popup could close before sending workspace switch commands.
- **Manifest Optimization**: Cleaned up unnecessary permission declarations to improve browser compatibility and loading speed.

### Technical Details
- Upgraded to Manifest V3 (Latest Stable).
- Optimized IPC communication between the popup and background service worker.
- Enhanced layout responsiveness for the extension action grid.

[Unreleased]: https://github.com/rzafiamy/memokit/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/rzafiamy/memokit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/rzafiamy/memokit/releases/tag/v1.2.0
