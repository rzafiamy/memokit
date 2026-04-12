# MemoKit v1.2.0 Release Notes 🧠

## What's New
- **Profile Viewer Dashboard**: You can now view URLs inside any Tab Profile directly from the options page using the new "View" (Eye) toggle.
- **Quick-Launch from Settings**: Added a direct launch button to the Profiles list, allowing you to switch workspaces without opening the popup.
- **"Close Others" Shortcut**: A new productivity icon in the popup that clears all non-essential tabs while keeping your active tab and all pinned tabs safe.

## Improvements & Stability
- **Safer Workspace Switching**: The background service worker now intelligently avoids closing the Options page during profile transitions.
- **Pinned Tab Protection**: Automated cleanup and "Close Others" actions now preserve your pinned tabs by default.
- **Bug Fixes**:
  - Resolved a fatal `startsWith` TypeError that occurred when visiting internal or privileged browser pages.
  - Fixed a race condition where the popup could close before sending workspace switch commands.
- **Manifest Optimization**: Cleaned up unnecessary permission declarations to improve browser compatibility and loading speed.

## Technical Details
- Upgraded to Manifest V3 (Latest Stable).
- Optimized IPC communication between the popup and background service worker.
- Enhanced layout responsiveness for the extension action grid.
